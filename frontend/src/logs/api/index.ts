import {proxy} from 'src/utils/queryUrlGenerator'
import AJAX from 'src/utils/ajax'
import {Namespace} from 'src/types'
import {TimeSeriesResponse} from 'src/types/series'
import {ServerLogConfig} from 'src/types/logs'
import {buildFindMeasurementQuery} from 'src/logs/utils'

export const executeQueryAsync = async (
  proxyLink: string,
  namespace: Namespace,
  query: string
): Promise<TimeSeriesResponse> => {
  const {data} = await proxy({
    source: proxyLink,
    db: namespace.database,
    rp: namespace.retentionPolicy,
    query,
  })

  return data
}

export const getLogConfig = async (url: string) => {
  try {
    return await AJAX({
      method: 'GET',
      url,
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const updateLogConfig = async (
  url: string,
  logConfig: ServerLogConfig
) => {
  try {
    return await AJAX({
      method: 'PUT',
      url,
      data: logConfig,
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const getSyslogMeasurement = async (
  proxyLink: string,
  namespace: Namespace
): Promise<TimeSeriesResponse> => {
  const query = buildFindMeasurementQuery(namespace, 'syslog')

  return executeQueryAsync(proxyLink, namespace, query)
}

export const getActivitylogMeasurement = async (
  proxyLink: string,
  namespace: Namespace
): Promise<TimeSeriesResponse> => {
  const query = buildFindMeasurementQuery(namespace, 'connectLog')

  return executeQueryAsync(proxyLink, namespace, query)
}
