import { Injectable } from '@nestjs/common';
import { add } from '@sqlgui/utils';

@Injectable()
export class AppService {
  getHello(): string {
    return `Hello from NestJS! 1 + 1 = ${add(1, 1)}`;
  }
}
