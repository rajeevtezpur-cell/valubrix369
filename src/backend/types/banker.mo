module {

  /// Approval status for banker applications.
  public type BankerStatus = {
    #pending;
    #approved;
    #rejected;
  };

  /// A banker signup application record.
  public type BankerApplication = {
    id        : Nat;
    principal : Principal;
    name      : Text;
    email     : Text;
    mobile    : Text;
    org       : Text;   // organisation / bank name
    city      : Text;
    appliedAt : Int;    // nanoseconds timestamp
    status    : BankerStatus;
    reviewedAt: ?Int;   // set when approved or rejected
    reviewNote: Text;   // admin note, empty string = none
  };

};
