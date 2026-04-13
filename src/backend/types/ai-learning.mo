module {

  /// A single AI learning submission — user-provided ground-truth sold price
  /// that feeds back into the AI training dataset.
  public type AILearningSubmission = {
    id          : Nat;
    locality    : Text;
    propertyType: Text;
    soldPrice   : Float;
    area        : Float;
    date        : Text;
    notes       : Text;
    submittedAt : Int;   // Time.now() — nanoseconds since epoch
  };

  /// Input payload accepted by saveAILearningSubmission.
  public type AILearningInput = {
    locality    : Text;
    propertyType: Text;
    soldPrice   : Float;
    area        : Float;
    date        : Text;
    notes       : Text;
  };

};
