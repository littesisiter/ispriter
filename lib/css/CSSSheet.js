
/**
 * 方便以后切换 CSS 解析器
 */

var fs = require('fs'),

    path = require('path'),

    CSSRule = require('./CSSRule').CSSRule,

    Logger = require('../Logger');


/*
    - CSSSheet {} css 文件信息汇总
        - filename css 文件名
        - filepath css 文件的绝对路径
        - cssRules [CSSRule] 该 css 文件的所有样式规则
        - imports [CSSSheet] @import 引入的所有样式文件 //TODO @import没有处理
        - uri css 文件中 @import 的原始值
 */

function CSSSheet(config, uri){
    
    this.config = config;

    this.uri = uri;

    this.filename = path.basename(uri);

    this.filepath = path.resolve(path.join(config.workspace, uri));

    this.content = fs.readFileSync(this.filepath).toString();

    this.cssRules = pickupCSSRules(this.content);;

}

/**
 * 收集带有background的cssrule(相当于一个带有background的class)
 * @param  {[type]} cssText [description]
 * @return {[type]}         [description]
 */
function pickupCSSRules(cssText){
    var length = cssText.length,
        cssRules = [],
        cssStr,
        cssName;
    var pos = -1,   //切割游标
        bgPos,      //background 的下标
        start, end, //这个class的相对值的start,end (就是“{”，“}”的位置)
        cssStart, cssEnd,  //包括cssname的的start,end
        tmpPos;     //临时游标

    // 用于对文本进行操作
    var tmpText,    //临时文本段
        thisText, //本次循环处理的文本段

        preText,
        postText;

    while(pos++ < length){

        // 把已经处理过的文本切出来
        thisText = cssText.substring(pos); // xx .name { color: #fff; background: xxx } xx

        // 把 background 找出来
        bgPos = thisText.indexOf('background'); // xx .name { color: #fff; [i]background: xxx } xx
        if(bgPos === -1){
            break;
        }

        // 向前 / 向后找到样式闭合点和样式名字
        // 向前找 {
        preText = thisText.substring(0, bgPos); // xx .name { color: #fff; 
        start = preText.lastIndexOf('{');  // xx .name []{ color: #fff; 
        //(这个class 前半部分被接收了)
        cssStr = preText.substring(start); // { color: #fff;  


        // 继续向前找cssName
        tmpText = preText.substring(0, start);    // xx .name 
        cssStart = tmpText.lastIndexOf('}') +1;   // 找到前一个样式的结束符, 中间的就是名字( +1 是为了跳过 } )

        // 中间可能有注释, 要排除掉注释
        cssName = tmpText.substring(cssStart).replace(/\/\*.*?\*\//, '');    // .name 

        // 向后找 }
        postText = thisText.substring(bgPos); // background: xxx }
        end = postText.indexOf('}') + 1;     // background: xxx []}  (+1 是为了包括 })
        // 这个class后半部分接收 
        cssStr += postText.substring(0, end); // background: xxx }  

        //位置要相对于整个css文件（注意start end 的相对值不一样的）
        cssStart = pos + start;
        cssEnd =  pos + bgPos + end + 1;

        // pos 是指在完整 cssText 中的位置
        cssRules.push(new CSSRule(cssName, cssStr, cssStart, cssEnd ));

        pos += (bgPos + end);  //只怎这次捕捉到的长度

    }

    // Logger.debug(cssRules);
    return cssRules;
}


/**
 * 把 CSSSheet 的内容转换成 css 字符串 (排序，切割，替换)
 * @return {String} css 字符串
 */
CSSSheet.prototype.toString = function() {
    var cursor = 0,
        content = this.content,
        cssRules = this.cssRules,
        cssTextArray = [];

    //根据start排序
    cssRules.sort(function(a,b){
        return a.start - b.start;
    });     

    for(var i in cssRules){
        var cssRule = cssRules[i];
        cssTextArray.push(content.slice(cursor,cssRule.start));
        cssTextArray.push(cssRule.toString()+'\n');
        cursor = cssRule.end;         
    }

    //闭合这段cssText
    cssTextArray.push(content.slice(cursor)); //末尾最后一段str


    return cssTextArray.join('');
};



exports.CSSSheet = CSSSheet;