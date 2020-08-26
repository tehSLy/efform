'use strict';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

Object.defineProperty(exports, "__esModule", { value: true });
exports.createField = void 0;
var tslib_1 = require("tslib");
var effector_react_1 = require("effector-react");
var react_1 = require("react");
exports.createField = function (form, render) {
    // @ts-ignore
    return function (_a) {
        var name = _a.name, props = tslib_1.__rest(_a, ["name"]);
        var value = effector_react_1.useStoreMap({
            store: form.values,
            // @ts-ignore
            fn: function (state) { return state[name] || null; },
            keys: [name],
        });
        var error = effector_react_1.useStoreMap({
            store: form.errors,
            // @ts-ignore
            fn: function (state) { return state[name] || null; },
            keys: [name],
        });
        //@ts-ignore
        var onChange = react_1.useCallback(function (value) { return form.set({ key: name, payload: value }); }, [name]);
        var validate = react_1.useCallback(function () { return form.validateField(name); }, [name]);
        // @ts-ignore
        return render({ onChange: onChange, validate: validate, value: value, error: error });
    };
};

var createField = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var src = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.a = void 0;

Object.defineProperty(exports, "createField", { enumerable: true, get: function () { return createField.createField; } });
exports.a = 1;

});

var index = /*@__PURE__*/getDefaultExportFromCjs(src);

module.exports = index;
//# sourceMappingURL=index.js.map
