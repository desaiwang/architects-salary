# visualizing architects' salaries

I visualized nearly 14,000 architects' salaries. Please see live demo [here](https://desaiwang.github.io/architects-salary/), and if you are curious about how I built it, check out my [blog](https://desaiwang.github.io/#/post/architects-salary)!

# site architecture

This site is built with html, css, and javascript. All the visualizations are done using the [d3 library](https://d3js.org/).

# data source and analysis

Survey data is from [Archinect.com](https://salaries.archinect.com/poll/results/country/united-states), and I used python for queries and analysis. I've linked the 3 relevant jupyter notebooks, and left simple annotations to explain my process.

1. [Data Query and Preprocessing](/data/archinect_query.ipynb)
2. [Exploratory Analysis and Charts](/data/exploratory_viz.ipynb)
3. [Inflation Analysis and Comparison with Google Salary Trends](/data/inflation_analysis.ipynb)

# acknowledgements

A lot of my code is derived from Prof. Jeff Rzezsotarski's course notes on data visualization (INFO3300 and INFO4310) as well as projects I did while taking those classes.

This site would not have been possible without the help of my lovely beta testers Camille, Sophie, Helen, Allen, Daniel, Jack, and many others.
