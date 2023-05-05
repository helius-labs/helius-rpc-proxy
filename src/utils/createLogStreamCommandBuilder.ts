import { Env } from '../types';
import { CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

export const createLogStreamCommandBuilder = ({
	env,
	currentDate,
}: {
	env: Env;
	currentDate: string;
}): CreateLogStreamCommand => {
	return new CreateLogStreamCommand({
		logGroupName: env.AWS_CLOUDWATCH_LOG_GROUP,
		logStreamName: currentDate,
	});
};
