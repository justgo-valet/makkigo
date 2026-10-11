import alimtalk from "@/features/consent/documents/alimtalk";
import appPush from "@/features/consent/documents/appPush";
import locationBasedService from "@/features/consent/documents/locationBasedService";
import privacyCollection from "@/features/consent/documents/privacyCollection";
import privacyThirdParty from "@/features/consent/documents/privacyThirdParty";
import termsOfService from "@/features/consent/documents/termsOfService";

import type { ConsentType } from "@/libs/consent/contracts/consents";

const consentDocuments: Readonly<Partial<Record<ConsentType, string>>> = {
  TERMS_OF_SERVICE: termsOfService,
  PRIVACY_COLLECTION: privacyCollection,
  PRIVACY_THIRD_PARTY: privacyThirdParty,
  APP_PUSH: appPush,
  ALIMTALK: alimtalk,
  LOCATION_BASED_SERVICE: locationBasedService,
};

export { consentDocuments };
