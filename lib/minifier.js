"use strict";
var fs = require("fs");
var path = require("path");
var child_process_1 = require("child_process");
var ngAnnotate = require("ng-annotate");
var UglifyJS = require("uglify-js");
var CleanCss = require("clean-css");
var mozjpeg = require("mozjpeg-stream");
var optipng = require("pngout-bin").path;
var Minifier = (function () {
    function Minifier(hookConf, platforms, basePath) {
        this.platformPaths = [];
        this.config = hookConf;
        this.platforms = platforms;
        this.basePath = basePath;
        this.cssMinifer = new CleanCss(this.config.cssOptions);
        this.setPlatformPaths();
    }
    Minifier.prototype.isHiddenFile = function (source) {
        return (/(^|\/)\.[^\/\.]/g).test(source);
    };
    Minifier.prototype.run = function () {
        var _this = this;
        this.platformPaths.forEach(function (platform) {
            _this.config.foldersToProcess.forEach(function (folder) {
                _this.processFiles(path.join(platform, folder));
            });
        });
    };
    Minifier.prototype.setPlatformPaths = function () {
        var _this = this;
        this.platforms.forEach(function (platform) {
            switch (platform) {
                case "android":
                    _this.platformPaths.push(path.join(_this.basePath, platform, "assets", "www"));
                    break;
                case "ios":
                case "windows":
                case "browser":
                    _this.platformPaths.push(path.join(_this.basePath, platform, "www"));
                    break;
                default:
                    console.log("Ionic minify supports Android, iOS, Windows Phone 8 and Browser only.");
                    break;
            }
        });
    };
    Minifier.prototype.processFiles = function (dir) {
        var _this = this;
        fs.readdir(dir, function (error, list) {
            if (error) {
                console.log("An error ocurred while reading directories: \n " + error);
                return;
            }
            else {
                list.forEach(function (file) {
                    file = path.join(dir, file);
                    fs.stat(file, function (err, stat) {
                        if (stat.isDirectory()) {
                            _this.processFiles(file);
                        }
                        else {
                            if (_this.isHiddenFile(file)) {
                                console.log("Not processing hidden file: " + file);
                            }
                            else {
                                _this.compress(file);
                            }
                        }
                    });
                });
            }
        });
    };
    Minifier.prototype.compress = function (file) {
        var extension = path.extname(file);
        var fileName = path.basename(file);
        if (fileName.indexOf(".min.") > -1) {
            extension = ".min" + extension;
        }
        try {
            var ext = extension.split('.')[1].toUpperCase();
            switch (extension) {
                case ".js":
                    console.log("Minifying: " + fileName);
                    this.compressJS(file, fileName);
                    break;
                case ".css":
                    console.log("Minifying: " + fileName);
                    this.compressCSS(file, fileName);
                    break;
                case ".jpg":
                case ".jpeg":
                    break;
                    console.log("Compressing: " + fileName);
                    this.compressJPG(file, fileName);
                    break;
                case ".png":
                    break;
                    this.compressPNG(file, fileName);
                    break;
                default:
                    break;
            }
        }
        catch (err) {
            console.log("Compressing/Minifying " + fileName + " resulted in an error and won't be compressed/minified.");
            if (this.config.showErrStack) {
                console.log(err.stack);
            }
        }
    };
    Minifier.prototype.compressJS = function (file, fileName) {
        var src = fs.readFileSync(file, "utf8");
        var lbPos = src.indexOf('\n');
        if (lbPos == -1 || lbPos > 400 || lbPos > (src.length - 100)) {
            console.log("Skipping JS file: Seems " + fileName + " is already minified!");
            return;
        }
        var ngSafeFile = ngAnnotate(src, { add: true });
        var result = UglifyJS.minify(ngSafeFile.src, this.config.jsOptions);
        fs.writeFileSync(file, result.code, "utf8");
        console.log("JS file: " + fileName + " has been minified!");
    };
    Minifier.prototype.compressCSS = function (file, fileName) {
        var src = fs.readFileSync(file, "utf8");
        var css = this.cssMinifer.minify(src);
        css = (css.styles) ? css.styles : css;
        fs.writeFileSync(file, css, "utf8");
        console.log("CSS file: " + fileName + " has been minified!");
    };
    Minifier.prototype.compressJPG = function (file, fileName) {
        var ws;
        fs.createReadStream(file)
            .pipe(mozjpeg(this.config.jpgOptions))
            .pipe(ws = fs.createWriteStream(file + ".jpg"));
        ws.on("error", function (err) {
            console.log("Compressing " + fileName + " resulted in an error and won't be compressed.");
        });
        ws.on("finish", function () {
            fs.unlinkSync(file);
            fs.renameSync(file + ".jpg", file);
            console.log("JPG image: " + fileName + " has been compressed!");
        });
    };
    Minifier.prototype.compressPNG = function (file, fileName) {
        var _this = this;
        child_process_1.execFile(optipng, [file, file + ".png", "-s0", "-k0", "-f0"], function (err) {
            if (err) {
                console.log("Compressing " + fileName + " resulted in an error and won't be compressed.");
                if (_this.config.showErrStack) {
                    console.log("An error has ocurred: " + err);
                }
            }
            else {
                fs.unlinkSync(file);
                fs.renameSync(file + ".png", file);
                console.log("PNG image: " + fileName + " has been compressed!");
            }
        });
    };
    return Minifier;
}());
exports.Minifier = Minifier;
