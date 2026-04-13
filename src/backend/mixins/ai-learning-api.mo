import AILearn  "../lib/ai-learning";

/// Mixin: AI Learning API
/// Exposes saveAILearningSubmission and getAILearningSubmissions.
/// State slices injected via mixin parameters:
///   submissionsRef : [AILearn.AILearningSubmission] (var, by reference via wrapper)
///   counterRef     : Nat (var, by reference via wrapper)
mixin (
  submissionsRef : { var aiLearningSubmissions : [AILearn.AILearningSubmission]; var aiLearningIdCounter : Nat }
) {

  /// Save a new AI learning submission (open to all — no auth required).
  /// Returns "ok" on success or an error message on failure.
  public shared func saveAILearningSubmission(
    input : AILearn.AILearningInput
  ) : async Text {
    submissionsRef.aiLearningIdCounter += 1;
    let record = AILearn.build(submissionsRef.aiLearningIdCounter, input);
    submissionsRef.aiLearningSubmissions := AILearn.append(submissionsRef.aiLearningSubmissions, record);
    "ok";
  };

  /// Retrieve all AI learning submissions (open read).
  public query func getAILearningSubmissions() : async [AILearn.AILearningSubmission] {
    AILearn.all(submissionsRef.aiLearningSubmissions);
  };

};
