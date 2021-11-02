const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');

// ビルドする際にHTMLも生成する
const HtmlWebpackPlugin = require('html-webpack-plugin');
// キャッシュパラメータを付与する
const cacheParam = new Date().getTime().toString();
// CSSを別ファイルに生成する
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// 画像をコピーする
const CopyWebpackPlugin = require('copy-webpack-plugin');
// 古いファイルと未使用のファイルを削除するため
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const Sass = require('sass');

module.exports = {
    // 'development' | 'production'
    mode: process.env.NODE_ENV,
    context: src,
    // メインのJSファイル
    entry: {
        app: './scripts/app.ts',
    },
    // ファイルの出力設定
    output: {
        //  出力ファイルのディレクトリ名
        path: dist,
        // 出力ファイル名
        filename: 'js/[name].bundle.js?[chunkhash:7]',
    },
    // ローカル開発用環境を立ち上げる
    devServer: {
        open: true,
        contentBase: src,
        inline: true,
        hot: true,
        watchContentBase: true,
        port: 3000,
    },
    // モジュールの解決方法を指定
    resolve: {
        modules: [src, 'node_modules'],
        // 拡張子を配列で指定
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /(\.s[ac]ss)$/, // 対象ファイルの拡張子
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { url: false } },
                    { loader: 'postcss-loader' },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: Sass,
                            // sassOptions: {
                            //     fiber: Fiber,
                            // },
                        },
                    },
                ],
            },
            {
                test: /\.(js|ts|tsx)$/,
                exclude: /node_modules\/(?!(dom7|ssr-window|swiper)\/).*/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        useBuiltIns: 'usage',
                                        corejs: '3.8',
                                    },
                                ],
                            ],
                        },
                    },
                ],
            },
            {
                test: /\.(js|ts|tsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    },
                ],
            },
            {
                // 対象となるファイルの拡張子
                test: /\.(gif|png|jpg|eot|wof|woff|woff2|ttf|svg)$/,
                // 画像をファイルとして取り込む
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'img/assets/',
                    publicPath: (path) => '../img/assets/' + path,
                },
            },
        ],
    },
    watchOptions: {
        poll: 1000,
        ignored: /node_modules/,
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'css/[name].css?[chunkhash:7]',
        }),
        new CleanWebpackPlugin(),
        //コピーする対象を選択
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(src, 'img'),
                    to: path.resolve(dist, 'img'),
                    toType: 'dir',
                    globOptions: {
                        ignore: ['*.DS_Store', '**/.gitkeep'],
                    },
                },
                {
                    from: path.resolve(src, 'obj'),
                    to: path.resolve(dist, 'obj'),
                    toType: 'dir',
                    globOptions: {
                        ignore: ['*.DS_Store', '**/.gitkeep'],
                    },
                },
                {
                    from: path.resolve(src, 'static'),
                    to: path.resolve(dist, './'),
                    toType: 'dir',
                },
            ],
        }),
        //index.html
        new HtmlWebpackPlugin({
            cacheParam: '?ver=' + cacheParam, // キャッシュパラメータ付与
            filename: 'index.html', // 出力するHTMLのファイル名
            template: 'index.html', // 出力するためのHTMLのテンプレート
            inject: 'body', // "body" | "head" | false
            minify: {
                removeComments: true, // コメント削除、圧縮
            },
        }),
        // その他
        // new HtmlWebpackPlugin({
        //   filename: "admin.html",
        //   template: "admin.html",
        // }),
    ],
};
