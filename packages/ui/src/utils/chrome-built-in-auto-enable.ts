import {
  CHROME_BUILT_IN_PROVIDER_ID,
  canAutoEnableChromeBuiltInConfig,
  checkChromeBuiltInAvailability,
  markChromeBuiltInAutoEnabled,
  type ChromeBuiltInStatus,
  type IModelManager
} from '@mindsync/core'

export interface ChromeBuiltInAutoEnableResult {
  checked: boolean
  enabled: boolean
  status: ChromeBuiltInStatus | null
}

export const autoEnableChromeBuiltInModelIfReady = async (
  modelManager: Pick<IModelManager, 'getModel' | 'updateModel'>,
  checkAvailability = checkChromeBuiltInAvailability
): Promise<ChromeBuiltInAutoEnableResult> => {
  const config = await modelManager.getModel(CHROME_BUILT_IN_PROVIDER_ID)
  if (!canAutoEnableChromeBuiltInConfig(config)) {
    return { checked: false, enabled: false, status: null }
  }

  const status = await checkAvailability()
  if (status.availability !== 'available') {
    return { checked: true, enabled: false, status }
  }

  await modelManager.updateModel(
    CHROME_BUILT_IN_PROVIDER_ID,
    markChromeBuiltInAutoEnabled(config)
  )

  return { checked: true, enabled: true, status }
}
