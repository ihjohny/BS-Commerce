import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import { withApiCors } from '../../../lib/api-cors'
import config from '../../../payload.config'

export const GET = withApiCors(REST_GET(config))
export const POST = withApiCors(REST_POST(config))
export const DELETE = withApiCors(REST_DELETE(config))
export const PATCH = withApiCors(REST_PATCH(config))
export const PUT = withApiCors(REST_PUT(config))
export const OPTIONS = withApiCors(REST_OPTIONS(config))
