# musical-tangents

Link to hosting website: https://manisetayesh.github.io/musical-tangents/

Link to screencast video: https://www.youtube.com/watch?v=gbWLO7s7mLc

___
## Project code breakdown:

- Main webpage code: index.html
- /data: Includes the original data files (ClassicHit.csv and Top100.csv). Python was used for data processing,
all .py and .json files (and energy_and_pop_data.csv) are processed files from the original data files.
- /js: Visualization javascript code using D3. Each (roughly) corresponds to a visualization, some are used for
handling other details of the website (e.g. two-paths data manipulation, tooltips, etc.)
- /css: Styling sheets. Brutalist.css is the overall style, scatter.css is used specifically for the scatter plot
of predicted vs. actual popularity.

- raw_files/: initial version where we didn't have the website and stylings yet, only the visualizations on a blank
background.
- webpage_design/: prototype v1 version of the website, rough around the edges. No longer supported.

___
## Libraries: 

- **Pandas** was used for processing the raw Kaggle data (stored in ClassicHit.csv) into energy_and_pop_data.csv
- The novel visualization (and all visualization) ideas are from our group. We utilized the **d3** library for 
implementing our visualizations, such as creating scales, appending DOM elements to visualization svg's or adding
text descriptions to our designs. We extended the basic functionality that d3 provided to implement custom concepts:
encoding genres by coloring a keyboard, creating a vinyl wall to map genre popularity, creating a genre popularity "race"
with a music staff as the medium, discs showcasing the most popular words found in songs for each decade, and a heartbeat 
graph comparing the tempos of two songs.
- **SkLearn** was utilized to create the linear regression model employed in our predicted vs actual popularity scatter plot.
