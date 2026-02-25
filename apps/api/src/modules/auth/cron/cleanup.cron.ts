import { ORMService } from '@/internal/database/generic/orm.client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';

@Injectable()
export class CleanUpSessionCron {
    private readonly logger: Logger = new Logger(CleanUpSessionCron.name);

    constructor(private readonly db: ORMService) {}

    @Cron('0 0 * * *') // Every day at midnight
    async tick() {
        const nowUnix = dayjs().unix();
        const challengeExpirationMinutes = +(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5);
        const challengeExpirationThreshold = dayjs().subtract(challengeExpirationMinutes, 'minute').toDate();

        const expiredSessions = await this.db.Session.findMany({
            where: { expire: { lt: nowUnix } },
        });

        const expiredSessionUuids = expiredSessions.map(session => session.uuid);

        const deletedChallenges = await this.db.AuthorizationChallenge.deleteMany({
            where:
                expiredSessionUuids.length > 0
                    ? {
                          OR: [{ created: { lt: challengeExpirationThreshold } }, { sessionUuid: { in: expiredSessionUuids } }],
                      }
                    : { created: { lt: challengeExpirationThreshold } },
        });

        const deletedInstances = await this.db.AuthorizationInstance.deleteMany({
            where:
                expiredSessionUuids.length > 0
                    ? {
                          OR: [{ expire: { lt: nowUnix } }, { sessionUuid: { in: expiredSessionUuids } }],
                      }
                    : { expire: { lt: nowUnix } },
        });

        const deletedSessions =
            expiredSessionUuids.length > 0
                ? await this.db.Session.deleteMany({
                      where: { uuid: { in: expiredSessionUuids } },
                  })
                : [];

        if (deletedSessions.length > 0 || deletedInstances.length > 0 || deletedChallenges.length > 0) {
            this.logger.log(
                `Cleanup done: sessions=${deletedSessions.length}, authorizationInstances=${deletedInstances.length}, authorizationChallenges=${deletedChallenges.length}`,
            );
        }
    }
}

