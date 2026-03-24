class Server {
  private middlewares() {}
  private routes() {}
  private errorHandlers() {}
  init() {
    this.middlewares();
    this.routes();
    this.errorHandlers();
    console.log("Server initialized");
  }
}

new Server().init();
