# musical-tangents

Link to hosting website: https://manisetayesh.github.io/musical-tangents/

Project code breakdown:

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