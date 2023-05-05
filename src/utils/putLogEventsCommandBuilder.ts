import { Env } from '../types';
import { PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

export const putLogEventsCommandBuilder = ({
	env,
	currentDate,
	requestMethod,
	statusCode,
	statusMessage,
	responseBody,
}: {
	env: Env;
	currentDate: string;
	requestMethod: string;
	statusCode: number;
	statusMessage: string;
	responseBody: string;
}): PutLogEventsCommand => {
	return new PutLogEventsCommand({
		logGroupName: env.AWS_CLOUDWATCH_LOG_GROUP,
		logStreamName: currentDate,
		logEvents: [
			{
				timestamp: Date.now(),
				message: `Error ${requestMethod} ${statusCode} ${statusMessage} ${responseBody}`,
			},
		],
	});
};
