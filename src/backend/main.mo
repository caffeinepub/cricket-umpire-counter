import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";



actor {
  type Team = {
    name : Text;
    score : Nat;
  };

  type Match = {
    team1 : Team;
    team2 : Team;
    overs : Nat;
    balls : Nat;
    date : Time.Time;
  };

  let matches = Map.empty<Time.Time, Match>();

  public shared ({ caller }) func saveMatch(team1Name : Text, team1Score : Nat, team2Name : Text, team2Score : Nat, overs : Nat, balls : Nat) : async () {
    let team1 : Team = {
      name = team1Name;
      score = team1Score;
    };
    let team2 : Team = {
      name = team2Name;
      score = team2Score;
    };
    let match : Match = {
      team1;
      team2;
      overs;
      balls;
      date = Time.now();
    };
    matches.add(match.date, match);
  };

  public query ({ caller }) func getAllMatches() : async [Match] {
    if (matches.isEmpty()) {
      Runtime.trap("No matches have been saved yet.");
    };
    matches.values().toArray();
  };
};
