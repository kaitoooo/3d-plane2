module.exports = {
    env: {
        browser: true, // ブラウザで実行されるコードを検証
        es6: true, // ES6で書かれたコードを検証
    },
    parserOptions: {
        sourceType: 'module', // ES Modules機能を有効
        ecmaVersion: 2015, // ECMAScript 2015
    },
    extends: ['plugin:prettier/recommended'],
};
