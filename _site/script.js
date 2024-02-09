class Island extends HTMLElement {
  static tagName = "is-land";

  constructor() {
    super();

    this.attrs = {
      autoInitType: "autoinit",
      import: "import",
      fallback: "fallback",
      scriptType: "module/island",
      template: "data-island"
    };

    this.conditionMap = {
      visible: Conditions.waitForVisible,
      idle: Conditions.waitForIdle,
      interaction: Conditions.waitForInteraction,
      media: Conditions.waitForMedia,
      "save-data": Conditions.checkSaveData,
    };

    // Internal promises
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  static getParents(el, selector) {
    let nodes = [];
    while(el) {
      if(el.matches && el.matches(selector)) {
        nodes.push(el);
      }
      el = el.parentNode;
    }
    return nodes;
  }

  static async ready(el) {
    let parents = Island.getParents(el, Island.tagName);
    let imports = await Promise.all(parents.map(el => el.wait()));

    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
  }

  async forceFallback() {
    let prefix = "is-island-waiting--";
    let extraSelector = this.fallback ? this.fallback : "";
    // Reverse here as a cheap way to get the deepest nodes first
    let components = Array.from(this.querySelectorAll(`:not(:defined)${extraSelector ? `,${extraSelector}` : ""}`)).reverse();
    let promises = [];

    // with thanks to https://gist.github.com/cowboy/938767
    for(let node of components) {
      if(!node.isConnected || node.localName === Island.tagName) {
        continue;
      }

      // assign this before we remove it from the document
      let readyP = Island.ready(node);

      // Special case for img just removes the src to preserve aspect ratio while loading
      if(node.localName === "img") {
        let attr = prefix + "src";
        // remove
        node.setAttribute(attr, node.getAttribute("src"));
        node.setAttribute("src", `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>`);

        promises.push(readyP.then(() => {
          // restore
          node.setAttribute("src", node.getAttribute(attr));
          node.removeAttribute(attr);
        }));
      } else { // everything else renames the tag
        // remove from document to prevent web component init
        let cloned = document.createElement(prefix + node.localName);
        for(let attr of node.getAttributeNames()) {
          cloned.setAttribute(attr, node.getAttribute(attr));
        }

        let children = Array.from(node.childNodes);
        for(let child of children) {
          cloned.append(child); // Keep the *same* child nodes, clicking on a details->summary child should keep the state of that child
        }
        node.replaceWith(cloned);

        promises.push(readyP.then(() => {
          // restore children (not cloned)
          for(let child of Array.from(cloned.childNodes)) {
            node.append(child);
          }
          cloned.replaceWith(node);
        }));
      }
    }

    return promises;
  }

  wait() {
    return this.ready;
  }

  getConditions() {
    let map = {};
    for(let key of Object.keys(this.conditionMap)) {
      if(this.hasAttribute(`on:${key}`)) {
        map[key] = this.getAttribute(`on:${key}`);
      }
    }

    return map;
  }

  async connectedCallback() {
    this.fallback = this.getAttribute(this.attrs.fallback)
    this.autoInitType = this.getAttribute(this.attrs.autoInitType);

    // Keep fallback content without initializing the components
    // TODO improvement: only run this for not-eager components?
    await this.forceFallback();

    await this.hydrate();
  }

  getInitScripts() {
    return this.querySelectorAll(`:scope script[type="${this.attrs.scriptType}"]`);
  }

  getTemplates() {
    return this.querySelectorAll(`:scope template[${this.attrs.template}]`);
  }

  replaceTemplates(templates) {
    // replace <template> with the live content
    for(let node of templates) {
      // get rid of the rest of the content on the island
      if(node.getAttribute(this.attrs.template) === "replace") {
        let children = Array.from(this.childNodes);
        for(let child of children) {
          this.removeChild(child);
        }
        this.appendChild(node.content);
        break;
      } else {
        node.replaceWith(node.content);
      }
    }
  }

  async hydrate() {
    let conditions = [];
    if(this.parentNode) {
      // wait for all parents before hydrating
      conditions.push(Island.ready(this.parentNode));
    }
    let attrs = this.getConditions();
    for(let condition in attrs) {
      if(this.conditionMap[condition]) {
        conditions.push(this.conditionMap[condition](attrs[condition], this));
      }
    }
    // Loading conditions must finish before dependencies are loaded
    await Promise.all(conditions);

    this.replaceTemplates(this.getTemplates());

    let mod;
    // [dependency="my-component-code.js"]
    let importScript = this.getAttribute(this.attrs.import);
    if(importScript) {
      // we could resolve import maps here manually but you’d still have to use the full URL in your script’s import anyway
      mod = await import(importScript);
    }

    // do nothing if has script[type="module/island"], will init manually in script via ready()
    let initScripts = this.getInitScripts();

    if(initScripts.length > 0) {
      // activate <script type="module/island">
      for(let old of initScripts) {
        let script = document.createElement("script");
        script.setAttribute("type", "module");
        // Idea: *could* modify this content to retrieve access to the modules therein
        script.textContent = old.textContent;
        old.replaceWith(script);
      }
    } else if(mod) {
      let autoInitType = this.autoInitType || importScript;
      if(autoInitType === "petite-vue" || autoInitType === "vue") {
        mod.createApp().mount(this);
      }
    }

    // When using <script type="module/island"> `readyResolve` will fire before any internal imports finish!
    this.readyResolve({
      import: mod
    });
  }
}

class Conditions {
  static waitForVisible(noop, el) {
    if(!('IntersectionObserver' in window)) {
      // runs immediately
      return;
    }

    return new Promise(resolve => {
      let observer = new IntersectionObserver(entries => {
        let [entry] = entries;
        if(entry.isIntersecting) {
          observer.unobserve(entry.target);
          resolve();
        }
      });

      observer.observe(el);
    });
  }

  static waitForIdle() {
    let onload = new Promise(resolve => {
      if(document.readyState !== "complete") {
        window.addEventListener("load", () => resolve(), { once: true });
      } else {
        resolve();
      }
    });

    if(!("requestIdleCallback" in window)) {
      // run immediately
      return onload;
    }

    // both idle and onload
    return Promise.all([
      new Promise(resolve => {
        requestIdleCallback(() => {
          resolve();
        });
      }),
      onload,
    ]);
  }

  static waitForInteraction(eventOverrides, el) {
    let events = ["click", "touchstart"];
    // event overrides e.g. on:interaction="mouseenter"
    if(eventOverrides) {
      events = (eventOverrides || "").split(",");
    }

    return new Promise(resolve => {
      function resolveFn(e) {
        resolve();

        // cleanup the other event handlers
        for(let name of events) {
          el.removeEventListener(name, resolveFn);
        }
      }

      for(let name of events) {
        el.addEventListener(name, resolveFn, { once: true });
      }
    });
  }

  static waitForMedia(query) {
    let mm = {
      matches: true
    };

    if(query && ("matchMedia" in window)) {
      mm = window.matchMedia(query);
    }

    if(mm.matches) {
      return;
    }

    return new Promise(resolve => {
      mm.addListener(e => {
        if(e.matches) {
          resolve();
        }
      });
    });
  }

  static checkSaveData(expects) {
    if("connection" in navigator && navigator.connection.saveData === (expects !== "false")) {
      return Promise.resolve();
    }

    // dangly promise
    return new Promise(() => {});
  }
}

// Should this auto define? Folks can redefine later using { component } export
if("customElements" in window) {
  window.customElements.define(Island.tagName, Island);
}

class SpeedlifyUrlStore {
	constructor() {
		this.fetches = {};
		this.responses = {};
		this.urls = {};
	}

	static normalizeUrl(speedlifyUrl, path) {
		let host = `${speedlifyUrl}${speedlifyUrl.endsWith("/") ? "" : "/"}`
		return host + (path.startsWith("/") ? path.substr(1) : path);
	}

	async fetchFromApi(apiUrl) {
		if(!this.fetches[apiUrl]) {
			this.fetches[apiUrl] = fetch(apiUrl);
		}

		let response = await this.fetches[apiUrl];
		if(!this.responses[apiUrl]) {
			this.responses[apiUrl] = response.json();
		}
		let json = await this.responses[apiUrl];
		return json;
	}

	async fetchHash(speedlifyUrl, url) {
		if(this.urls[speedlifyUrl]) {
			return this.urls[speedlifyUrl][url] ? this.urls[speedlifyUrl][url].hash : false;
		}

		let apiUrl = SpeedlifyUrlStore.normalizeUrl(speedlifyUrl, "api/urls.json");
		let json = await this.fetchFromApi(apiUrl);

		return json[url] ? json[url].hash : false;
	}

	async fetchData(speedlifyUrl, hash) {
		let apiUrl = SpeedlifyUrlStore.normalizeUrl(speedlifyUrl, `api/${hash}.json`);
		return this.fetchFromApi(apiUrl);
	}
}

// Global store
const urlStore = new SpeedlifyUrlStore();

class SpeedlifyScore extends HTMLElement {
	static register(tagName) {
		customElements.define(tagName || "speedlify-score", SpeedlifyScore);
	}

	static attrs = {
		url: "url",
		speedlifyUrl: "speedlify-url",
		hash: "hash",
		rawData: "raw-data",
		requests: "requests",
		weight: "weight",
		rank: "rank",
		rankChange: "rank-change",
		score: "score",
	}

	static css = `
:host {
	--_circle: var(--speedlify-circle);
	display: flex;
	align-items: center;
	gap: 0.375em; /* 6px /16 */
}
.circle {
	font-size: 0.8125em; /* 13px /16 */
	min-width: 2.6em;
	height: 2.6em;
	line-height: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	border: 0.15384615em solid currentColor; /* 2px /13 */
	color: var(--_circle, #666);
}
.circle-good {
	color: #088645;
	border-color: #0cce6b;
}
.circle-ok {
	color: #ffa400;
	border-color: currentColor;
}
.circle-bad {
	color: #ff4e42;
	border-color: currentColor;
}
.meta {
	display: flex;
	align-items: center;
	gap: 0.625em; /* 10px /16 */
}
.circle + .meta {
	margin-left: 0.25em; /* 4px /16 */
}
.rank:before {
	content: "Rank #";
}
.rank-change:before {
	line-height: 1;
}
.rank-change.up {
	color: green;
}
.rank-change.up:before {
	content: "⬆";
}
.rank-change.down {
	color: red;
}
.rank-change.down:before {
	content: "⬇";
}
`;

	connectedCallback() {
		if (!("replaceSync" in CSSStyleSheet.prototype) || this.shadowRoot) {
			return;
		}

		this.speedlifyUrl = this.getAttribute(SpeedlifyScore.attrs.speedlifyUrl);
		this.shorthash = this.getAttribute(SpeedlifyScore.attrs.hash);
		this.rawData = this.getAttribute(SpeedlifyScore.attrs.rawData);
		this.url = this.getAttribute(SpeedlifyScore.attrs.url) || window.location.href;

		if(!this.rawData && !this.speedlifyUrl) {
			console.error(`Missing \`${SpeedlifyScore.attrs.speedlifyUrl}\` attribute:`, this);
			return;
		}

		// async
		this.init();
	}

	_initTemplate(data, forceRerender = false) {
		if(this.shadowRoot && !forceRerender) {
			return;
		}
		if(this.shadowRoot) {
			this.shadowRoot.innerHTML = this.render(data);
			return;
		}

		let shadowroot = this.attachShadow({ mode: "open" });
		let sheet = new CSSStyleSheet();
		sheet.replaceSync(SpeedlifyScore.css);
		shadowroot.adoptedStyleSheets = [sheet];

		let template = document.createElement("template");
		template.innerHTML = this.render(data);
		shadowroot.appendChild(template.content.cloneNode(true));
	}

	async init() {
		if(this.rawData) {
			let data = JSON.parse(this.rawData);
			this.setDateAttributes(data);
			this._initTemplate(data);
			return;
		}

		let hash = this.shorthash;
		let forceRerender = false;
		if(!hash) {
			this._initTemplate(); // skeleton render
			forceRerender = true;

			// It’s much faster if you supply a `hash` attribute!
			hash = await urlStore.fetchHash(this.speedlifyUrl, this.url);
		}

		if(!hash) {
			console.error( `<speedlify-score> could not find hash for URL (${this.url}):`, this );
			return;
		}

		// Hasn’t already rendered.
		if(!forceRerender) {
			this._initTemplate(); // skeleton render
			forceRerender = true;
		}

		let data = await urlStore.fetchData(this.speedlifyUrl, hash);
		this.setDateAttributes(data);

		this._initTemplate(data, forceRerender);
	}

	setDateAttributes(data) {
		if(!("Intl" in window) || !Intl.DateTimeFormat || !data.timestamp) {
			return;
		}
		const date = new Intl.DateTimeFormat().format(new Date(data.timestamp));
		this.setAttribute("title", `Results from ${date}`);
	}

	getScoreClass(score) {
		if(score === "" || score === undefined) {
			return "circle";
		}
		if(score < .5) {
			return "circle circle-bad";
		}
		if(score < .9) {
			return "circle circle-ok";
		}
		return "circle circle-good";
	}

	getScoreHtml(title, value = "") {
		return `<span title="${title}" class="${this.getScoreClass(value)}">${value ? parseInt(value * 100, 10) : "…"}</span>`;
	}

	render(data = {}) {
		let attrs = SpeedlifyScore.attrs;
		let content = [];

		// no extra attributes
		if(!this.hasAttribute(attrs.requests) && !this.hasAttribute(attrs.weight) && !this.hasAttribute(attrs.rank) && !this.hasAttribute(attrs.rankChange) || this.hasAttribute(attrs.score)) {
			content.push(this.getScoreHtml("Performance", data.lighthouse?.performance));
			content.push(this.getScoreHtml("Accessibility", data.lighthouse?.accessibility));
			content.push(this.getScoreHtml("Best Practices", data.lighthouse?.bestPractices));
			content.push(this.getScoreHtml("SEO", data.lighthouse?.seo));
		}

		let meta = [];
		let summarySplit = data.weight?.summary?.split(" • ") || [];
		if(this.hasAttribute(attrs.requests) && summarySplit.length) {
			meta.push(`<span class="requests">${summarySplit[0]}</span>`);
		}
		if(this.hasAttribute(attrs.weight) && summarySplit.length) {
			meta.push(`<span class="weight">${summarySplit[1]}</span>`);
		}
		if(this.hasAttribute(attrs.rank)) {
			let rankUrl = this.getAttribute("rank-url");
			meta.push(`<${rankUrl ? `a href="${rankUrl}"` : "span"} class="rank">${data.ranks?.cumulative}</${rankUrl ? "a" : "span"}>`);
		}
		if(this.hasAttribute(attrs.rankChange) && data.previousRanks) {
			let change = data.previousRanks?.cumulative - data.ranks?.cumulative;
			meta.push(`<span class="rank-change ${change > 0 ? "up" : (change < 0 ? "down" : "same")}">${change !== 0 ? Math.abs(change) : ""}</span>`);
		}
		if(meta.length) {
			content.push(`<span class="meta">${meta.join("")}</span>`)
		}

		return content.join("");
	}
}

if(("customElements" in window) && ("fetch" in window)) {
	SpeedlifyScore.register();
}
function makeTable(table) {
  let labels = [];
  let series = [];

  let rows = Array.from(table.querySelectorAll(":scope tbody tr"));
  let minY = 90;
  let maxY = 100;
  rows = rows.reverse();

  for(let row of rows) {
    let label = row.children[0].innerText.split(" ");
    labels.push(label.slice(0,2).join(" "));
    let childCount = row.children.length - 1;
    let seriesIndex = 0;
    for(let j = 0, k = childCount; j<k; j++) {
      let data = row.children[j + 1].dataset;
      if(data && data.numericValue) {
        minY = Math.min(data.numericValue, minY);
        maxY = Math.max(data.numericValue, maxY);
        if(!series[seriesIndex]) {
          series[seriesIndex] = [];
        }
        series[seriesIndex].push(data.numericValue);
        seriesIndex++;
      }
    }
  }

  let options = {
    high: Math.max(maxY, 100),
    low: Math.max(0, minY - 5),
    fullWidth: true,
    onlyInteger: true,
    showPoint: false,
    lineSmooth: true,
    axisX: {
      showGrid: true,
      showLabel: true
    },
    chartPadding: {
      right: 40
    }
  };

  new Chartist.Line(table.parentNode.nextElementSibling, {
    labels: labels,
    series: series
  }, options);
}

function initializeAllTables(scope) {
  let tables = scope.querySelectorAll("[data-make-chart]");
  for(let table of tables) {
    // make sure not in a closed details
    if(table.closest("details[open]") || !table.closest("details")) {
      makeTable(table);
    }
  }
}

initializeAllTables(document);

let details = document.querySelectorAll("details");
// let first = true;
for(let detail of details) {
  // open the first details by default
  // if(first) {
  //   detail.open = true;
  //   first = false;
  // }
  detail.addEventListener("toggle", function(e) {
    let open = e.target.hasAttribute("open");
    if(open) {
      initializeAllTables(e.target);
    }
    let row = e.target.closest(".leaderboard-list-entry-details");
    row.classList.toggle("expanded", open);
    row.previousElementSibling.classList.toggle("expanded", open);
  });
}

let expandAliases = document.querySelectorAll("[data-expand-alias]");
for(let alias of expandAliases) {
  alias.addEventListener("click", function(e) {
    e.preventDefault();
    let href = e.target.closest("a[href]").getAttribute("href");
    if(href) {
      let details = document.querySelector(href);
      if(details) {
        details.open = !details.hasAttribute("open");
      }
    }
  }, false);
}

;(function() {
	if(!("customElements" in window) || !("Intl" in window) || !Intl.RelativeTimeFormat) {
		return;
	}
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	customElements.define("timestamp-ago", class extends HTMLElement {
		connectedCallback() {
			let timestamp = this.getAttribute("timestamp");
			if(timestamp) {
				let date = (new Date()).setTime(timestamp);
				let diff = Math.floor((date - Date.now())/(1000 * 60 * 60));
				this.setAttribute("title", this.innerText);
				this.innerText = rtf.format(diff, "hour");
			}
		}
	});
})();
