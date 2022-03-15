module.exports = {
  mode: 'development',
  entry: './src/js/main.js',
  devtool: "inline-source-map",
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  }
}
