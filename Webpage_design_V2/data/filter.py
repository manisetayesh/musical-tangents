import pandas as pd
import csv

# read classic hits csv, store in a dataframe
music_data = pd.read_csv('ClassicHit.csv')
# obtain all genres and years
genres = list(set(music_data['Genre']))
years = list(set(music_data['Year']))

print(genres)

# energy and popularity data to be written to csv (begins with headers)
energy_and_pop_data = [['Genre', 'Year', 'Average Popularity', 'Average Energy']]

# # debug
# debug_df = music_data[(music_data['Genre']) == 'Today']
# print(set(debug_df['Year']))

for genre in genres:
    for year in years:
        # extract music data by genre and year
        songs_by_genre_and_year = music_data[(music_data['Genre'] == genre) & (music_data['Year'] == year)]

        popularity_scores = songs_by_genre_and_year['Popularity']
        energy_scores = songs_by_genre_and_year['Energy']

        # compute mean popularity and energy for genre and year (e.x. avg pop of jazz in 1980)
        mean_pop = popularity_scores.mean()
        energy_pop = energy_scores.mean()

        # format popularity data
        if pd.isna(mean_pop):
            mean_pop = 0
        else:
            mean_pop = int(mean_pop)

        # format energy data
        if pd.isna(energy_pop):
            energy_pop = 0
        else:
            energy_pop = round(float(energy_pop), 2)

        popularity_info = [genre, year, mean_pop, energy_pop]
        energy_and_pop_data.append(popularity_info)

with open('energy_and_pop_data.csv', 'w', newline='') as new_csv:
    writer = csv.writer(new_csv)
    writer.writerows(energy_and_pop_data)
