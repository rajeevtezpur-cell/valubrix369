import Types "../types/ai-learning";
import Time   "mo:core/Time";

module {

  public type AILearningSubmission = Types.AILearningSubmission;
  public type AILearningInput      = Types.AILearningInput;

  /// Build a new AILearningSubmission from an input payload and a sequential id.
  public func build(id : Nat, input : AILearningInput) : AILearningSubmission {
    {
      id;
      locality     = input.locality;
      propertyType = input.propertyType;
      soldPrice    = input.soldPrice;
      area         = input.area;
      date         = input.date;
      notes        = input.notes;
      submittedAt  = Time.now();
    };
  };

  /// Append a submission to the store and return the updated store.
  public func append(
    store  : [AILearningSubmission],
    record : AILearningSubmission
  ) : [AILearningSubmission] {
    store.concat([record]);
  };

  /// Return all submissions (identity pass-through — kept for symmetry and future filtering).
  public func all(store : [AILearningSubmission]) : [AILearningSubmission] {
    store;
  };

};
