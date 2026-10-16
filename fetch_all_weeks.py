import json

# I'll compile all weeks from the successful WebFetch data I have
# Week 1-8 are confirmed, now I need to systematically get 9-18

weeks_confirmed = {
    1: {"games": 16, "byes": 0},
    2: {"games": 16, "byes": 0},
    3: {"games": 16, "byes": 0},
    4: {"games": 16, "byes": 0},
    5: {"games": 15, "byes": 2},  # CAR, KC
    6: {"games": 14, "byes": 4},  # CIN, DET, MIA, MIN
    7: {"games": 14, "byes": 4},  # BUF, JAX, LAC, WAS
    8: {"games": 14, "byes": 4},  # HOU, NO, NYG, SF
}

print("WEEKS CONFIRMED FROM PUBLIC NFL.COM PAGES:")
print("Week | Games | Byes | Teams")
print("-" * 40)

total_games = 0
for week_num in sorted(weeks_confirmed.keys()):
    w = weeks_confirmed[week_num]
    games = w["games"]
    byes = w["byes"]
    teams = games * 2 + byes
    total_games += games
    print(f"{week_num:2} | {games:5} | {byes:4} | {teams}")

print("-" * 40)
print(f"Subtotal (Weeks 1-8): {total_games} games")
print()
print("REMAINING: Weeks 9-18 (need to fetch 10 more weeks)")
print()
print("Expected pattern:")
print("- Weeks 9-11: 16 games, 4 byes each = 14 games net")
print("- Week 12: 15 games, 4 byes (1 bye = 31 teams... ERROR - need odd number)")
print("- Weeks 13-18: 16 games each, varying byes")
print()
print("Need to continue fetching Weeks 9-18 from NFL.com")

