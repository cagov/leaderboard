# CA.gov sites leaderboard

This project measures the performance of State of California websites.

It's an instance of [speedlify](https://www.speedlify.dev/). Check it out at the following URL.

[https://cagov.github.io/leaderboard/ca.gov/](https://cagov.github.io/leaderboard/ca.gov/)

## V3, Feb. 2024

Updated to the latest version of speedlify.

## Modifications from stock speedlify

We've added a [pathPrefix configuration](https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix) into the `.eleventy.js` file. This helps the pages work on the `/leaderboard/` subdirectory in GitHub Pages.

We've also added a GitHub Actions workflow at `.github/workflows/publish.yml`. This workflow builds the site and pushes the latest files into the `gh-pages` branch of the repo. GitHub Pages hosts the site out of that branch.

## Run locally

You'll need a recent version of [NodeJS](https://nodejs.org/) to run this project.

First, install the project's dependencies.

```
npm install
```

Next, run the page performance tests. Note: this may take one or two hours to finish.

```
npm run test-pages
```

Build the site from the test results. (This is optional, as the next command will perform this task too. We're just adding it here for educational purposes.)

```
npm run build
```

Finally, start up the test site.

```
npm run start
```

This should give you a test page at [http://localhost:8080/leaderboard/](http://localhost:8080/leaderboard/).

To summarize...

```
npm install
npm run test-pages
npm run build
npm run start
```

## Updating the live pages

To update the live site on GitHub Pages, follow the above commands to set up the site on your local machine.

The `npm run test-pages` command will create new results in the `_data/results` folder. Create a git commit with those new results, then push the changes up to the `main` branch on GitHub. The GitHub Action workflow (mentioned above) will take care of the rest.

## Updating the list of measured sites

Sites may be added, edited, and removed from the `_data/sites/cagov.js` file. You'll need to rebuild the site to see the new results.
