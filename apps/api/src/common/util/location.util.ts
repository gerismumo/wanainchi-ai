import { kenyaLocations } from 'ke-locations-data';

export const getLocationName = ({
  code,
  type,
}: {
  code?: string | null;
  type?: string | null;
}): string => {
  if (!code || !type) {
    return '';
  }

  switch (type) {
    case 'county': {
      const county = kenyaLocations.getCountyByCode(code);
      return county ? county.name : '';
    }

    case 'constituency': {
      const constituency = kenyaLocations.getConstituencyByCode(code);
      return constituency
        ? `${constituency.name}, ${constituency.county_name}`
        : '';
    }

    case 'ward': {
      const ward = kenyaLocations.getWardByCode(code);
      return ward
        ? `${ward.name}, ${ward.constituency_name}, ${ward.county_name}`
        : '';
    }

    case 'locality': {
      const locality = kenyaLocations.getLocalityByCode(code);
      return locality ? `${locality.name}, ${locality.county_name}` : '';
    }

    case 'area': {
      const area = kenyaLocations.getAreaByCode(code);
      return area ? `${area.name}, ${area.locality}, ${area.county_name}` : '';
    }

    default:
      return '';
  }
};
