# ats4-scraper

Goes through left_menu.php and fetches all departments and courses.

### Note

Since it is very early alpha, there might be breaking changes in api, also there are some major/minor bugs, PR welcome.

# Usage

```javascript
import { RecurseScraper } from "ats4-scraper";
// const RecurseScraper = require("ats4-scraper");
const s = new RecurseScraper({
  baseUrl: "http://url/to/ats4/portal", // required
  outputPath: "data.json", // where scraped data should be stored, leave empty to disable
  maxRecursionDepth: 7, // how far should scraper go before throwing error | required
  initialDate: 0 // required for plan fetching | required
});
// awaitable method - does not return anything at the moment
s.run();
await s.run();
s.run().then(() => {})
```

# Todo
+ Add CLI support
+ Add RateLimiter to all HTTP requests
+ Add caching support

and many more...
