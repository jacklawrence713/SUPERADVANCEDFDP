#!/usr/bin/env python3
"""Generate top 50 player props for weeks 1-6"""

TOP_50 = [
    ("Bijan Robinson", "RB", "ATL"), ("Ja'Marr Chase", "WR", "CIN"), ("Jahmyr Gibbs", "RB", "DET"),
    ("Josh Allen", "QB", "BUF"), ("Saquon Barkley", "RB", "PHI"), ("Joe Burrow", "QB", "CIN"),
    ("Jared Goff", "QB", "DET"), ("A.J. Brown", "WR", "PHI"), ("Stefon Diggs", "WR", "BUF"),
    ("Justin Jefferson", "WR", "MIN"), ("Patrick Mahomes", "QB", "KC"), ("Christian McCaffrey", "RB", "SF"),
    ("Derrick Henry", "RB", "BAL"), ("Tee Higgins", "WR", "CIN"), ("CeeDee Lamb", "WR", "DAL"),
    ("Puka Nacua", "WR", "LAR"), ("Travis Kelce", "TE", "KC"), ("Amon-Ra St. Brown", "WR", "DET"),
    ("Rashee Rice", "WR", "KC"), ("Brock Purdy", "QB", "SF"), ("Lamar Jackson", "QB", "BAL"),
    ("Breece Hall", "RB", "NYJ"), ("Jonathan Taylor", "RB", "IND"), ("Tyreek Hill", "WR", "MIA"),
    ("Jaxon Smith-Njigba", "WR", "SEA"), ("Chris Olave", "WR", "NO"), ("Nico Collins", "WR", "HOU"),
    ("James Cook", "RB", "BUF"), ("Caleb Williams", "QB", "CHI"), ("Tua Tagovailoa", "QB", "MIA"),
    ("Jordan Love", "QB", "GB"), ("Malik Nabers", "WR", "NYG"), ("Kyle Pitts", "TE", "ATL"),
    ("Justin Herbert", "QB", "LAC"), ("Drake Maye", "QB", "NE"), ("D'Andre Swift", "RB", "CHI"),
    ("Dalton Kincaid", "TE", "BUF"), ("Devon Achane", "RB", "MIA"), ("Kenneth Walker III", "RB", "KC"),
    ("Javonte Williams", "RB", "DAL"), ("Tyler Shough", "QB", "NO"), ("Trey McBride", "TE", "ARI"),
    ("Will Levis", "QB", "TEN"), ("Geno Smith", "QB", "SEA"), ("Dak Prescott", "QB", "DAL"),
    ("Russell Wilson", "QB", "DEN"), ("Brock Bowers", "TE", "LV"), ("Nick Chubb", "RB", "CLE"),
]

# Opponent matchups for each week
MATCHUPS = {
    1: {"ATL":"PIT", "CIN":"TB", "DET":"NO", "BUF":"HOU", "PHI":"WAS", "KC":"DEN", "SF":"LAR", "BAL":"IND", "DAL":"NYG", "MIN":"GB", "MIA":"LV", "CHI":"CAR", "CLE":"JAX", "LAC":"ARI"},
    2: {"CIN":"DET", "PHI":"SF", "ATL":"LAR", "BUF":"NO", "BAL":"KC", "CHI":"NE", "JAX":"HOU", "NYJ":"TEN", "LAC":"CLE", "CAR":"NO", "DAL":"WAS", "ARI":"GB", "SEA":"DEN"},
    3: {"BUF":"MIA", "SF":"LAR", "DET":"TB", "CIN":"PIT", "NE":"CHI", "HOU":"JAX", "NYJ":"TEN", "LAC":"CLE", "KC":"BAL", "CAR":"NO", "PHI":"ATL", "DAL":"WAS", "ARI":"GB", "SEA":"DEN"},
    4: {"KC":"NE", "LAR":"ARI", "DET":"SEA", "NYJ":"TEN", "HOU":"IND", "MIA":"JAX", "BUF":"LAC", "BAL":"TB", "CIN":"WSH", "PIT":"NO", "GB":"DAL", "CAR":"ATL", "PHI":"SF", "LV":"CHI"},
    5: {"BUF":"TEN", "KC":"DEN", "LAR":"SEA", "NE":"MIA", "PHI":"NYG", "CIN":"WAS", "JAX":"NO", "LAC":"TB", "BAL":"PIT", "ARI":"GB", "ATL":"HOU", "NYJ":"CAR", "DAL":"SF", "CHI":"IND"},
    6: {"DEN":"SEA", "JAX":"HOU", "CHI":"ATL", "BAL":"CLE", "TEN":"IND", "NYJ":"NE", "NYG":"NO", "CAR":"PHI", "TB":"PIT", "LAR":"ARI", "KC":"LAC", "BUF":"LV", "GB":"DAL", "SF":"WAS"},
}

for week in range(1, 7):
    print(f"\n// ==================== WEEK {week} ====================")
    print(f"props: [")
    for name, pos, team in TOP_50:
        opp = MATCHUPS[week].get(team)
        if not opp:
            continue

        if pos == "QB":
            print(f'  {{name:"{name}",pos:"{pos}",team:"{team}",stat:"Pass Yds",ou:260,opp:"{opp}"}},')
        elif pos == "RB":
            print(f'  {{name:"{name}",pos:"{pos}",team:"{team}",stat:"Rush Yds",ou:75,opp:"{opp}"}},')
        elif pos in ["WR"]:
            print(f'  {{name:"{name}",pos:"{pos}",team:"{team}",stat:"Rec Yds",ou:80,opp:"{opp}"}},')
        elif pos == "TE":
            print(f'  {{name:"{name}",pos:"{pos}",team:"{team}",stat:"Rec Yds",ou:55,opp:"{opp}"}},')

        print(f'  {{name:"{name}",pos:"{pos}",team:"{team}",stat:"Any TD",ou:0,opp:"{opp}",odds:"-140"}},')

    print(f"] as {{name:string,pos:string,team:string,stat:string,ou:number,opp:string,odds?:string}}[],")
    print(f"propResults: {{}} // TODO: populate with actual results")
