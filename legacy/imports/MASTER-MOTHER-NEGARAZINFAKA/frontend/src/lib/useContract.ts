import { fetchContract, type Contract } from './http/openapi';
import { usePlatformCall, type Call } from './usePlatformCall';

/**
 * The running host's own API contract, as a screen-level call.
 *
 * Every screen that has to say what the platform does or does not offer reads it from here, so one fetch per
 * mount answers "is this module real" for the whole page, and the answer cannot differ between two cards
 * sitting next to each other.
 */
export function useContract(): Call<Contract> {
  return usePlatformCall<Contract>((signal) => fetchContract(signal), []);
}
