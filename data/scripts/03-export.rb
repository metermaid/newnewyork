require "rubygems"
require "arrayfields"
require "sqlite3"
require "set"

def ratings_breakdown(ratings)
    ratings[0..ratings.length].to_s.split(//).map{|s| $ratings_map[s]} rescue nil
end

db = SQLite3::Database.new( "movies.sqlite3" )
db.results_as_hash= true
sql = "
	SELECT DISTINCT title, year, imdb_votes, location FROM Locations JOIN Keywords USING (movie_id) JOIN movies ON (Locations.movie_id = Movies.id) WHERE movie_id NOT IN (SELECT DISTINCT movie_id FROM Locations WHERE location LIKE '%New York City%' AND movie_id IS NOT NULL) AND keyword = 'new-york-city' AND imdb_votes > 1500 ORDER BY imdb_votes ASC"

i = 0 

File.open("movies.tsv", "w") do |out|
	out << [
		'title', 'year', 'imdb_votes', 'location'
	].flatten.join("\t") + "\n"
	db.execute(sql) do |row| 
		puts i if (i = i + 1) % 5000 == 0

		out << [
			row["title"], 
			row["year"], 
			row["imdb_votes"],
			row["location"]
		].flatten.join("\t") + "\n"
	end
end
