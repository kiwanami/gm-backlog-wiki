// ==UserScript==
// @name           Backlog-Wiki
// @namespace      kiwanami.net/backlog
// @description    customizing backlog
// @include        https://*.backlog.jp/*
// @require        http://kiwanami.net/prog/gm_update/UC-20080823.js
// @version        0.1.0
// ==/UserScript==

// Time-stamp: <2008-10-31 14:17:03 sakurai>

//==================================================
// 自動更新機能
// ref: http://blog.fulltext-search.biz/archives/2008/08/update-checker-4-greasemonkey.html

if (typeof UpdateChecker != "undefined") {
    new function() {
        var uc = new UpdateChecker(
            {
                script_name: 'Backlog Wiki improve'
                ,script_url: 'http://kiwanami.net/prog/gm_backlog/wiki/backlog-wiki.user.js'
                ,current_version: '0.1.0' // ### VERSION ###
            });
        GM_registerMenuCommand('Backlog Wiki - update check', 
                               function() { 
                                   GM_setValue('last_check_day',"Thu Jan 01 1970 00:00:00 GMT+0900");
                                   uc.check_update();
                               });
    }
}

//==================================================

var $$ = unsafeWindow.$$;
var $ = unsafeWindow.$;

var url = location.href;
var projectKey = getProjectKey();

function getProjectKey() {
    var m = url.match(/\/(projects|find|file|subversion|add|wiki)\/([^?/]+)/);
    if (m) return m[2];
    m = url.match(/^(.*)\/[a-zA-Z]+.action.*projectKey=([^&]*)/);
    if (m) return m[2];
    var elm = document.getElementById("navi-home");
    if (elm) {
        m = elm.href.match(/\/projects\/(.*)$/);
        if (m) return m[1];
    }
    return "[unknown]";
}

//==================================================
// wikiのタグ表示を改善

if (url.match(/FindWiki.action/)) {
    improveTagList();
}

function addResultStyle() {
    addStyle("table.view td {line-height: 100%; padding: 2px 4px; border-bottom: 0px}");
    addStyle("table.view td a {}");
    addStyle("table.view tr.odd {background-color:#F0F0F0;}");
    addStyle("table.view tr.even {background-color:#FFF;}");
    addStyle("span.title { font-size:0.875em; }");
    addStyle("span.timestamp, span.content { color:#666666; font-size:0.75em;}");
    addStyle("#bodyRight .right_content { font-size:1em; line-height:110%; }");
}

function improveTagList() {
    $$("table.view").each(function(i){layoutResultTable(i);});
    addResultStyle();
}

function layoutResultTable(element) {
    function makeList(tr) {
        var td = tr.getElementsByTagName("td")[0];
        var title,time;
        for(var i=0,j=td.childNodes.length;i<j;i++) {
            var c = td.childNodes[i];
            if (c && c.className) {
                if (c.className == "title") {
                    title = c;
                } else if (c.className == "timestamp") {
                    time = c;
                }
            }
        }
        td.innerHTML = "";
        td.appendChild(title);
        var td2 = E("td");
        td2.appendChild(time);
        tr.appendChild(td2);
    }

    var trs = element.getElementsByTagName("tr");
    for(var i=0;i<trs.length;i++) {
        var tr = trs[i];
        makeList(tr);
        tr.className = (i % 2 == 1) ? "odd" : "even";
    };
}

//==================================================
// Wiki menu

if (url.match(/\/(wiki\/|FindWiki.action)/)) {
    shrinkPageList();
    addMenu();
    addIncrementalSearch();
    addResultStyle();
}

function addIncrementalSearch() {
    var submenu = $$('div.subMenu')[0] || $$('div.pageNavi')[0];
    var resultElm = E("div",{id: "searchResults"});
    submenu.parentNode.insertBefore(resultElm,submenu);
    
    var searchField = $("wikisearch");
    var lastTextValue = searchField.value;
    var fixedTextValue = lastTextValue;
    setInterval(
        function() {
            var current = searchField.value;
            //2回同じだったら検索する（入力途中は検索させない）
            if (current != lastTextValue) {
                lastTextValue = current;
            } else if (lastTextValue != fixedTextValue) {
                fixedTextValue = lastTextValue;
                isearchWiki(current,resultElm);
            }
        },400);
}

function isearchWiki(text,resultElm) {
    if (text == "") {
        resultElm.innerHTML = "";
        return;
    }
    
    var form = document.forms[1];//FindWiki.action
    GM_xmlhttpRequest(
        {
            method: 'get',
            url: form.action+"?projectKey="+projectKey+"&query="+encodeURIComponent(text),
            overrideMimeType: document.contentType+"; charset="+document.characterSet,
            onload: function(details){
                replaceSearchResult(details.responseText);
            }
        });
    function replaceSearchResult(responseText) {
        resultElm.innerHTML = "<h4>Search Results</h4><br class='clear'/>"+scrapingResults(responseText);
        var tables = resultElm.getElementsByTagName("table");
        if (tables) {
            layoutResultTable(tables[0]);
        }
    }
    function scrapingResults(wholeText) {
        var m = wholeText.match(/<table class="view">([\s\S]*?)<\/table>/);
        return (m) ? m[0] : "No results...";
    }
}

function shrinkPageList() {
    var titleElm = $$("#bodyRight h4")[2];
    if (!titleElm) return;
    var body = $$("#bodyRight div.right_content")[2];
    var showFlag = false;
    body.hide();
    titleElm.addEventListener("click",function(ev) {
        if (!showFlag) {
            body.show();
        } else {
            body.hide();
        }
        showFlag = !showFlag;
    },false);
}

function addMenu() {
    var baseUrl;
    var m = url.match(/^(.*\/wiki\/[^/]*)/);
    if (m) {
        //wikiクリック
        baseUrl = m[1];
    } else {
        //tagクリック
        m = url.match(/^(.*)\/FindWiki.action.*projectKey=([^&]*)/);
        if (!m) return;
        baseUrl = m[1]+"/wiki/"+m[2];
    }
    if (url.match(/(query|tagName)/)) {
        //FindWiki.cssにはloom.cssが無い...
        var link = E("link",{href    :"/styles/common/loom.R20080930.css",
                             rel     : "stylesheet",
                             type    : "text/css",
                             charset : "utf-8"});
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(link);
    }
    retrieveDigestText(baseUrl+"/Menu");

    function retrieveDigestText(href) {
        GM_log(href);
        GM_xmlhttpRequest({
            method: 'get',
            url: href,
            overrideMimeType: document.contentType+"; charset="+document.characterSet,
            onload: function(details){
                var menuHTML = scrapingMenu(details.responseText);
                if (menuHTML) {
                    addMenuArea(menuHTML);
                }
            }
        });
    }
    function scrapingMenu(wholeText) {
        var m = wholeText.match(/<div id="loom" class="loom">([\s\S]*)<\/div><!-- End loom -->/);
        return (m) ? trim(m[1]) : null;
    }
    function trim(t) {
        return t.replace(/^\s*/,"").replace(/\s*$/,"");
    }
    function addMenuArea(html) {
        var outer = $("bodyRight");
        if (!outer) return;
        var titleElm = outer.getElementsByTagName("span")[0];
        titleElm.innerHTML = "Menu";
        var contentElm = outer.getElementsByTagName("div")[2];
        var menuElm = document.createElement("div");
        menuElm.className = "loom";
        menuElm.innerHTML = html;
        contentElm.insertBefore(menuElm,contentElm.childNodes[2]);
    }
}

//==================================================
// utility

function $x(p, context) {
    if (!context) context = document;
    var i, arr = [], xpr = document.evaluate(p, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (i = 0; item = xpr.snapshotItem(i); i++) arr.push(item);
    return arr;
}

function addStyle(css) {
    GM_addStyle(css.replace(/;/g,' !important;'));
}

function E(tag,attrs,children) {
    var elm = document.createElement(tag);
    for(var i in attrs) {
        if ("id className textContent".indexOf(i) >= 0) {
            elm[i] = attrs[i];
        } else {
            elm.setAttribute(i,attrs[i]);
        }
    }
    if (children) {
        for(var i=0;i<children.length;i++) {
            elm.appendChild(children[i]);
        }
    }
    return elm;
}

function collectElements( tagName, className, /* option */ childTag ) {
    var es = document.getElementsByTagName(tagName);
    var ret = [];
    for (var i = 0; i < es.length; i++) {
        var el = es[i];
        if (el.className == className) {
            if (childTag) {
                var e = el.getElementsByTagName(childTag)[0];
                if (e) {
                    ret.push(e);
                }
            } else {
                ret.push(el);
            }
        }
    }
    return ret;
}
