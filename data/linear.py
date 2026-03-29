import pandas as pd
import json
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

# 1. Load and Clean
df = pd.read_csv("./data/ClassicHit.csv").dropna()
features = [
    "Danceability",
    "Energy",
    "Loudness",
    "Speechiness",
    "Acousticness",
    "Instrumentalness",
    "Liveness",
    "Valence",
    "Tempo",
]
target = "Popularity"

X = df[features]
y = df[target]
model = LinearRegression()
model.fit(X, y)

df["predicted"] = model.predict(X)
output_data = df.to_dict(orient="records")
with open("data/predictions.json", "w") as f:
    json.dump({"data": output_data}, f)

# print(f"Model Accuracy (R^2): {model.score(X, y):.4f}")
# coefficients = dict(zip(features, model.coef_.tolist()))
# intercept = model.intercept_

# print(f"Intercept (Beta 0): {intercept}")
# print("Coefficients:", json.dumps(coefficients, indent=4))
