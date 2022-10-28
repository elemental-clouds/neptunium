import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';

import { AWSRegionName } from '@elemental-clouds/hydrogen/Common';
import { Credentialed } from '@elemental-clouds/carbon';
import assert from 'assert';

interface RegionalClass {
  defaultRegion: string;
  global?: boolean;
}

export class Regions extends Credentialed {
  /** All possible AWS regions */
  protected regions: AWSRegionName[] = [];

  /** default region */
  protected region: string;

  /** true if the service is an AWS global service such as IAM */
  protected global;

  constructor(args: RegionalClass) {
    super();

    this.region = args.defaultRegion;
    this.global = args.global || false;
  }

  async setAllAvailableRegions() {
    const ec2 = new EC2Client({
      credentials: this.credentials,
      region: this.region,
    });

    const describeRegions = await ec2.send(new DescribeRegionsCommand({}));

    assert(describeRegions.Regions, 'DescribeRegions did not return Regions');

    for (const region of describeRegions.Regions) {
      assert(region.RegionName, 'DescribeRegions did not return RegionName');

      assert(
        region.OptInStatus,
        `${region.RegionName} did not return OptInStatus`
      );

      if (['opt-in-not-required', 'opted-in'].includes(region.OptInStatus)) {
        this.regions.push(region.RegionName);
      }
    }
  }

  async setServiceRegions() {
    assert(this.region, 'initial region or default region not set');

    this.regions = [this.region];

    /** if resources are region dependent */
    if (this.global === false) {
      await this.setAllAvailableRegions();
    }

    return this;
  }

  async getRegions() {
    await this.setServiceRegions();

    return this.regions;
  }
}
