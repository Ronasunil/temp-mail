import { SMTPServer, SMTPServerAddress, SMTPServerOptions } from "smtp-server";
import AppEnv from "../packages/shared/config/env.config";

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

  private config() {
    const smtpServerOpt: SMTPServerOptions = {
      authOptional: true,
      onRcptTo: this.rcptoHandler(),
    };
  }

  init() {
    smtpServer.listen(AppEnv.SMTP_SERVER_PORT, () => {
      this.config();
      console.info(
        `SMTP Server is listening on port ${AppEnv.SMTP_SERVER_PORT}`,
      );
    });
  }
}

const smtpServerInstance = new SmtpServer();
smtpServerInstance.init();
