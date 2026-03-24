import { SMTPServer, SMTPServerAddress, SMTPServerOptions } from "smtp-server";

const smtpServer = new SMTPServer();

class SmtpServer {
  private rcptoHandler() {
    return (address: SMTPServerAddress, session: any, callback: any) => {
      const receiveraddress = address.address;

      if (!receiveraddress.endsWith("mailloop.online"))
        // TODO convert to AppError
        throw new Error("Invalid recipient address");

      callback();
    };
  }

  config() {
    const smtpServerOpt: SMTPServerOptions = {
      authOptional: true,
      onRcptTo: this.rcptoHandler(),
    };
  }
  
  init() {
    smtpServer.listen(2525, () => {
      console.log("SMTP Server is listening on port 2525");
    });
  }
}
