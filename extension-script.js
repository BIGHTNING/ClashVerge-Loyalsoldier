// 给当前订阅自动创建一个名为 PROXY 的代理组，并注入 Loyalsoldier 规则
// 如果你想把代理组改成其他名称，只需要修改这一行
var PROXY_GROUP = "PROXY";

var BASE_URL = "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release";

function addProvider(providers, key, fileName, behavior) {
  providers[key] = {
    type: "http",
    behavior: behavior,
    url: BASE_URL + "/" + fileName + ".txt",
    path: "./ruleset/loyalsoldier/" + fileName + ".yaml",
    interval: 86400
  };
}

function hasGroup(config, groupName) {
  if (!Array.isArray(config["proxy-groups"])) {
    return false;
  }

  for (var i = 0; i < config["proxy-groups"].length; i++) {
    if (config["proxy-groups"][i] && config["proxy-groups"][i].name === groupName) {
      return true;
    }
  }

  return false;
}

function main(config) {
  // 1. 确保 proxy-groups 存在
  if (!Array.isArray(config["proxy-groups"])) {
    config["proxy-groups"] = [];
  }

  // 2. 如果没有 PROXY 代理组，则创建一个
  // include-all: true 会尝试包含当前配置中的所有可用代理节点
  if (!hasGroup(config, PROXY_GROUP)) {
    config["proxy-groups"].unshift({
      name: PROXY_GROUP,
      type: "select",
      proxies: ["DIRECT"],
      "include-all": true
    });
  }

  // 3. 注入 Loyalsoldier rule-providers
  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }

  addProvider(config["rule-providers"], "ls-reject", "reject", "domain");
  addProvider(config["rule-providers"], "ls-private", "private", "domain");
  addProvider(config["rule-providers"], "ls-direct", "direct", "domain");
  addProvider(config["rule-providers"], "ls-proxy", "proxy", "domain");
  addProvider(config["rule-providers"], "ls-gfw", "gfw", "domain");
  addProvider(config["rule-providers"], "ls-tld-not-cn", "tld-not-cn", "domain");

  addProvider(config["rule-providers"], "ls-telegramcidr", "telegramcidr", "ipcidr");
  addProvider(config["rule-providers"], "ls-lancidr", "lancidr", "ipcidr");
  addProvider(config["rule-providers"], "ls-cncidr", "cncidr", "ipcidr");

  addProvider(config["rule-providers"], "ls-applications", "applications", "classical");

  // 4. 前置规则
  // 自定义规则优先匹配，未匹配到的流量继续走原订阅规则
  var prependRules = [
    "RULE-SET,ls-applications,DIRECT",
    "RULE-SET,ls-private,DIRECT",
    "RULE-SET,ls-reject,REJECT",
    "RULE-SET,ls-direct,DIRECT",

    "RULE-SET,ls-proxy," + PROXY_GROUP,
    "RULE-SET,ls-gfw," + PROXY_GROUP,
    "RULE-SET,ls-tld-not-cn," + PROXY_GROUP,
    "RULE-SET,ls-telegramcidr," + PROXY_GROUP + ",no-resolve",

    "RULE-SET,ls-lancidr,DIRECT,no-resolve",
    "RULE-SET,ls-cncidr,DIRECT,no-resolve"
  ];

  // 5. 避免重复插入 ls-* 规则
  var oldRules = [];
  if (Array.isArray(config["rules"])) {
    for (var i = 0; i < config["rules"].length; i++) {
      var rule = String(config["rules"][i]);
      if (rule.indexOf("RULE-SET,ls-") !== 0) {
        oldRules.push(config["rules"][i]);
      }
    }
  }

  config["rules"] = prependRules.concat(oldRules);

  return config;
}
