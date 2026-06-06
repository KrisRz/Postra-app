import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

@Injectable()
export class EncryptTokens {
  constructor(private _integrationService: IntegrationService) {}
  @Command({
    command: 'encrypt-tokens',
    describe:
      'One-off: encrypt at rest any integration tokens still stored as plaintext',
  })
  async encrypt() {
    const result = await this._integrationService.backfillTokenEncryption();
    console.log(
      `Token encryption backfill complete: ${result.updated}/${result.total} integrations encrypted.`
    );
    return true;
  }
}
