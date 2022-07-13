const fastGlob = require('fast-glob')
const fs = require('fs')
const path = require('path')
var import_style = require("windicss/utils/style");
var import_utils3 = require("@antfu/utils");
const regexHtmlTag = /<(\w[\w-]*)([\S\s]*?)\/?>/mg;
var regexClassSplitter = /[\s'"`{}]/g;
var regexClassCheck1 = /^!?[a-z\d@<>.+-](?:\([\w,.%#\(\)+-]*\)|[\w:/\\,%#\[\].$-])*$/;
var regexAttributifyItem = /(?:\s|^)([\w+:_/-]+)\s?=\s?(['"{])((?:\\\2|\\\\|\n|\r|.)*?)(?:\2|\})/gm;
var regexClassCheck2 = /[a-z].*[\w)\]]$/;
var regexClassChecks = [
  regexClassCheck1,
  regexClassCheck2
];
const windiConfig = require('../windi.config.js')
var windicss = require("windicss");
const processor = new windicss(windiConfig);
let classesPending = /* @__PURE__ */ {};
const classesGenerated = /* @__PURE__ */ {};
const layerStylesMap = /* @__PURE__ */ {};
const layers = {
    base: {},
    utilities: {},
    components: {}
  };
let dirs = []
let commonDir = []
const attributes = [];
function validClassName(i) {
    return regexClassChecks.every((r) => i.length > 2 && i.match(r));
}
function getFiles(options) {
    const files = fastGlob.sync(options.include, {
      ignore: options.exclude,
      onlyFiles: true,
      absolute: true
    });
    return files;
}
function include(set, v) {
    for (const i of v)
      set.add(i);
}
function DefaultExtractor(code) {
    const tags = Array.from(code.matchAll(regexHtmlTag));
    const tagNames = tags.map((i) => i[1]);
    return {
      tags: tagNames,
      get classes() {
        return code.split(regexClassSplitter).filter(validClassName);
      },
      get attributes() {
        const attrRanges = [];
        const attributes = {
          names: [],
          values: []
        };
        const attributesBlocklist = ["class", "className"];
        const tagsBlocklist = ["meta", "script", "style", "link"];
        tags.filter((i) => !tagsBlocklist.includes(i[1])).forEach((i) => {
          return Array.from(i[2].matchAll(regexAttributifyItem) || []).forEach((match) => {
            let name = match[1];
            const [full, , , value] = match;
            name = name.replace(/^(:|v-bind:)/, "");
            if (attributesBlocklist.includes(name))
              return;
            attributes.names.push(name);
            attributes.values.push(value);
            if (match.index != null)
              attrRanges.push([match.index, match.index + full.length]);
          });
        });
        return attributes;
      }
    };
}
async function applyExtractors(code) {
  return Promise.all([DefaultExtractor].map((extractor) => extractor(code))).then((results) => {
    const attributesNames = results.flatMap((v) => {
    var _a, _b;
    return (_b = (_a = v.attributes) == null ? void 0 : _a.names) != null ? _b : [];
    });
    const attributesValues = results.flatMap((v) => {
    var _a, _b;
    return (_b = (_a = v.attributes) == null ? void 0 : _a.values) != null ? _b : [];
    });
    return {
    tags: (0, import_utils3.uniq)(results.flatMap((v) => {
        var _a;
        return (_a = v.tags) != null ? _a : [];
    })),
    ids: (0, import_utils3.uniq)(results.flatMap((v) => {
        var _a;
        return (_a = v.ids) != null ? _a : [];
    })),
    classes: (0, import_utils3.uniq)(results.flatMap((v) => {
        var _a;
        return (_a = v.classes) != null ? _a : [];
    })),
    attributes: attributesNames.length || attributesValues.length ? {
        names: attributesNames,
        values: attributesValues
    } : void 0
    };
  });
}
function addClasses(classes, dir, file) {
  if(!classesGenerated[dir] || !classesPending[dir]){
    classesGenerated[dir] = new Set()
    classesPending[dir] = new Set()
  }
  classes.forEach((i) => {
      if (!i || classesGenerated[dir].has(i) || classesPending[dir].has(i))
      return;
      file.includes(dir) && classesPending[dir].add(i);
  });
  return classesPending;
}
async function extractFileLoader(code, dir, file) {
  const extractResult = await applyExtractors(code);
  if (windiConfig.attributify) {
    const extractedAttrs = extractResult.attributes;
    if (extractedAttrs == null ? void 0 : extractedAttrs.names.length) {
      extractedAttrs.names.forEach((name2, i) => {
        attributes.push([name2, extractedAttrs.values[i]]);
      });
    }
    return new Promise((resolve) => {
      resolve(addClasses((extractedAttrs == null ? void 0 : extractedAttrs.classes) || extractResult.classes || [], dir, file))
    })
  } else {
    return new Promise((resolve) => {
      resolve(addClasses(extractResult.classes || [], dir, file))
    })
  }
}
function buildLayerCss(layer,dir) {
    var _a;
    const style = new import_style.StyleSheet(Array.from(layerStylesMap[dir].values()).flatMap((i) => i).filter((i) => i.meta.type === layer));
    style.prefixer = (_a = windiConfig.prefixer) != null ? _a : true;
    return `${style.build()}`
}
async function buildPendingStyles(dir) {
  var _a, _b;
  if(!classesPending[dir]){
    classesPending[dir] = new Set()
  }
  if (classesPending[dir].size) {
    const result = processor.interpret(Array.from(classesPending[dir]).join(" "));
    if (result.success.length) {
      updateLayers(result.styleSheet.children, "__classes", dir, false);
      include(classesGenerated[dir], result.success);
      classesPending[dir].clear();
    }
  }
  function updateLayers(styles, filepath, dir, replace = true) {
    var _a;
    const timestamp = +Date.now();
    const changedLayers = /* @__PURE__ */ new Set();
    styles.forEach((i) => changedLayers.add(i.meta.type));
    if (replace) {
      (_a = layerStylesMap[dir].get(filepath)) == null ? void 0 : _a.forEach((i) => changedLayers.add(i.meta.type));
      layerStylesMap[dir].set(filepath, styles);
    } else {
      const prevStyles = layerStylesMap[dir].get(filepath) || [];
      layerStylesMap[dir].set(filepath, prevStyles.concat(styles));
    }
    for (const name2 of changedLayers) {
      const layer = layers[name2];
      if (layer) {
        layer.timestamp = timestamp;
        layer.cssCache = void 0;
      }
    }
  }
  // if (windiConfig.attributify) {
  //   if (attributes.length) {
  //     const attributesObject = {};
  //     attributes.filter((i) => i[0] && i[1]).forEach(([name2, value]) => {
  //       if (!attributesObject[name2])
  //         attributesObject[name2] = [];
  //       attributesObject[name2].push(...String(value).split(regexClassSplitter).filter(Boolean));
  //     });
  //     const attributifyStyle = processor.attributify(attributesObject);
  //     updateLayers(attributifyStyle.styleSheet.children, "__attributify", dir, false);
  //     attributes.length = 0;
  //   }
  // }
}
async function generateCSS(layer,dir) {
  await buildPendingStyles(dir);
  return buildLayerCss(layer,dir)
}
function getCommonClass(main){
  const allClasses = Object.keys(classesPending).reduce((acc , cur)=> acc.concat(Array.from(classesPending[cur])),[])
  const classTimes = allClasses.reduce((acc, c)=> {acc[c] ? acc[c]++ : acc[c] = 1; return acc},{})
  const commonClass = Object.keys(classTimes).filter(c=> classTimes[c] >= 2)
  let classArray = {}
  Object.keys(classesPending).forEach(key => {
    classArray[key] = Array.from(classesPending[key]).filter(c => !commonClass.includes(c))
    if(Array.from(classesPending[key]).length !== classArray[key].length){
      commonDir.push(key)
    }
  })
  commonClass.length && (classArray[main] = commonClass)
  classesPending = Object.keys(classArray).reduce((acc,k) =>{
    acc[k] = new Set(classArray[k])
    return acc
  },{})
}
function relativeFilePath(a, b) {
  return new Array((a.split('/').length - b.split('/').length)).fill('../').join('')
}
// function attributify(files) {
//   // attributify mode
//   files.forEach(function (file) {
//       var parser = new index_ts$2.HTMLParser(fs$8.readFileSync(file).toString());
//       var attrs = parser
//           .parseAttrs()
//           .reduceRight(function (a, b) {
//           var _a;
//           if (b.key === 'class' || b.key === 'className')
//               return a;
//           if (b.key in a) {
//               a[b.key] = Array.isArray(a[b.key])
//                   ? Array.isArray(b.value) ? __spreadArray(__spreadArray([], a[b.key], true), b.value, true) : __spreadArray(__spreadArray([], a[b.key], true), [b.value], false)
//                   : __spreadArray([a[b.key]], (Array.isArray(b.value) ? b.value : [b.value]), true);
//               return a;
//           }
//           return Object.assign(a, (_a = {}, _a[b.key] = b.value, _a));
//       }, {});
//       var utility = processor.attributify(attrs);
//       styleSheets[file] = utility.styleSheet;
//   });
// }
class MpxAtomicClassWebpackPlugin {
    constructor(options = {}) { // include exclude
      this.options = options
    }
    apply(compiler) {
      compiler.hooks.done.tap('MpxAtomicClassWebpackPlugin',async () => {
        const files = getFiles(this.options)
        const absoluteDirs = []
        dirs = this.options.include.map(dir => {
          return dir.split('/').splice(0,3).join('/')
        })
        dirs.forEach(dir => {
          absoluteDirs.push(path.join(__dirname, '../',dir))
        })
        await Promise.all(dirs.map(async dir => { 
          layerStylesMap[dir] = new Map()
          return Promise.all(files.map(async file => {
            const data = fs.readFileSync(file, 'utf8')
            return extractFileLoader(data, dir, file)
          }))
        }))
        getCommonClass(this.options.main)
        if (dirs.length > 1) {
          dirs.push(this.options.main)
          layerStylesMap[this.options.main] = new Map()
          classesGenerated[this.options.main] = new Set()
        }
        dirs.forEach(async dir => {
          const cssData = await generateCSS('utilities', dir)
          let importStr = ''
          if(commonDir.includes(dir)){
            importStr = `@import '${relativeFilePath(dir, this.options.main)}index.wxss';\n`
          }
          dir && fs.writeFile(`${dir}/index.wxss`, importStr + cssData, (err)=>{
            if(err){
                console.log('err',err)
            }
          })
        })
        files.forEach(file => {
          let cssFile = file.split('/').splice(0, file.split('/').length-1).join('/') 
          const dirPath = absoluteDirs.filter(dir => file.includes(dir))[0]
          const importFile = relativeFilePath(cssFile , dirPath)
          cssFile = cssFile + '/index.wxss'
          fs.writeFile(cssFile, `@import '${importFile}index.wxss';\n`, (err)=>{
            if(err){
              console.log('err', err)
            }
          })
        })
      });
    }
  }
  
module.exports = MpxAtomicClassWebpackPlugin;