import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const { method, url } = req;
    const userAgent = req.headers['user-agent'] || '';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.getHeader('content-length');

      this.logger.log(
        `${method} ${url} ${statusCode} ${contentLength} - ${userAgent}`,
      );
    });

    next();
  }
}
