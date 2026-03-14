import Runtime "mo:core/Runtime";

actor {
  type MatchState = {
    runs : Nat;
    wickets : Nat;
    overs : Nat;
    balls : Nat;
  };

  var savedMatchState : ?MatchState = null;

  public shared ({ caller }) func saveMatchState(runs : Nat, wickets : Nat, overs : Nat, balls : Nat) : async () {
    savedMatchState := ?{
      runs;
      wickets;
      overs;
      balls;
    };
  };

  public query ({ caller }) func getSavedMatchState() : async MatchState {
    switch (savedMatchState) {
      case (null) { Runtime.trap("No match state has been saved yet.") };
      case (?state) { state };
    };
  };
};
