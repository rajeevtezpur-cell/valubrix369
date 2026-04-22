import BankerLib  "../lib/banker";
import AccessControl "mo:caffeineai-authorization/access-control";
import Map       "mo:core/Map";
import Runtime   "mo:core/Runtime";

/// Mixin: Banker Approval API
///
/// Exposes:
///   registerBankOfficer   — self-register; status = #pending
///   getMyBankerStatus     — caller checks own application status
///   getPendingBankers     — admin only: list all #pending applications
///   getAllBankerApps      — admin only: list all applications
///   approveBankOfficer    — admin only: approve by application id
///   rejectBankOfficer     — admin only: reject by application id
///
/// State injected:
///   bankerAppsRef.bankerApps       : Map<Nat, BankerApplication>
///   bankerAppsRef.bankerAppCounter : Nat
///   accessControlState             : AccessControl.AccessControlState
mixin (
  bankerAppsRef : {
    var bankerApps       : Map.Map<Nat, BankerLib.BankerApplication>;
    var bankerAppCounter : Nat;
  },
  accessControlState : AccessControl.AccessControlState
) {

  // ── Register (self-service) ────────────────────────────────────────

  /// Any user can register as a banker. Status starts as #pending.
  /// Returns the new application id.
  public shared ({ caller }) func registerBankOfficer(
    name   : Text,
    email  : Text,
    mobile : Text,
    org    : Text,
    city   : Text
  ) : async Nat {
    // Prevent duplicate applications from the same principal
    switch (BankerLib.getByPrincipal(bankerAppsRef.bankerApps, caller)) {
      case (?_) { Runtime.trap("Banker application already submitted") };
      case (null) {};
    };
    bankerAppsRef.bankerAppCounter += 1;
    let app = BankerLib.build(
      bankerAppsRef.bankerAppCounter,
      caller,
      name,
      email,
      mobile,
      org,
      city
    );
    bankerAppsRef.bankerApps.add(app.id, app);
    app.id
  };

  // ── Status check ──────────────────────────────────────────────────

  /// Caller checks the status of their own application.
  /// Returns "pending" | "approved" | "rejected" | "not_found".
  public query ({ caller }) func getMyBankerStatus() : async Text {
    switch (BankerLib.getByPrincipal(bankerAppsRef.bankerApps, caller)) {
      case (null) { "not_found" };
      case (?app) {
        switch (app.status) {
          case (#pending)  { "pending"  };
          case (#approved) { "approved" };
          case (#rejected) { "rejected" };
        };
      };
    };
  };

  // ── Admin queries ─────────────────────────────────────────────────

  /// Returns all banker applications with status = #pending.
  /// Admin only.
  public query ({ caller }) func getPendingBankers() : async [BankerLib.BankerApplication] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view pending bankers");
    };
    BankerLib.getPending(bankerAppsRef.bankerApps)
  };

  /// Returns all banker applications regardless of status.
  /// Admin only.
  public query ({ caller }) func getAllBankerApps() : async [BankerLib.BankerApplication] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all banker applications");
    };
    BankerLib.getAll(bankerAppsRef.bankerApps)
  };

  // ── Admin actions ─────────────────────────────────────────────────

  /// Approve a banker application by id. Admin only.
  /// Returns true on success, false if id not found.
  public shared ({ caller }) func approveBankOfficer(id : Nat, note : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve banker applications");
    };
    BankerLib.approve(bankerAppsRef.bankerApps, id, note)
  };

  /// Reject a banker application by id. Admin only.
  /// Returns true on success, false if id not found.
  public shared ({ caller }) func rejectBankOfficer(id : Nat, note : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can reject banker applications");
    };
    BankerLib.reject(bankerAppsRef.bankerApps, id, note)
  };

};
