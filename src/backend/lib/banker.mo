import Types "../types/banker";
import Time   "mo:core/Time";
import Map    "mo:core/Map";

module {

  public type BankerApplication = Types.BankerApplication;
  public type BankerStatus      = Types.BankerStatus;

  // ── Build ─────────────────────────────────────────────────────────

  public func build(
    id      : Nat,
    caller  : Principal,
    name    : Text,
    email   : Text,
    mobile  : Text,
    org     : Text,
    city    : Text
  ) : BankerApplication {
    {
      id;
      principal  = caller;
      name;
      email;
      mobile;
      org;
      city;
      appliedAt  = Time.now();
      status     = #pending;
      reviewedAt = null;
      reviewNote = "";
    };
  };

  // ── Queries ───────────────────────────────────────────────────────

  public func getPending(store : Map.Map<Nat, BankerApplication>) : [BankerApplication] {
    store.values().toArray().filter(func(a : BankerApplication) : Bool {
      a.status == #pending
    });
  };

  public func getAll(store : Map.Map<Nat, BankerApplication>) : [BankerApplication] {
    store.values().toArray();
  };

  public func getByPrincipal(
    store  : Map.Map<Nat, BankerApplication>,
    caller : Principal
  ) : ?BankerApplication {
    store.values().toArray().find(func(a : BankerApplication) : Bool {
      a.principal == caller
    });
  };

  // ── Approve ───────────────────────────────────────────────────────

  public func approve(
    store  : Map.Map<Nat, BankerApplication>,
    id     : Nat,
    note   : Text
  ) : Bool {
    switch (store.get(id)) {
      case (null) { false };
      case (?app) {
        store.add(id, {
          app with
          status     = #approved;
          reviewedAt = ?Time.now();
          reviewNote = note;
        });
        true
      };
    };
  };

  // ── Reject ────────────────────────────────────────────────────────

  public func reject(
    store  : Map.Map<Nat, BankerApplication>,
    id     : Nat,
    note   : Text
  ) : Bool {
    switch (store.get(id)) {
      case (null) { false };
      case (?app) {
        store.add(id, {
          app with
          status     = #rejected;
          reviewedAt = ?Time.now();
          reviewNote = note;
        });
        true
      };
    };
  };

};
