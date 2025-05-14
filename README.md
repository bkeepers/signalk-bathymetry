# signalk-bathymetry

A [Signal K](https://signalk.org/) plugin to collect and share bathymetry data.

> **Crowdsourced bathymetry** is the collection and sharing of depth measurements from vessels, using
> standard navigation instruments, while engaged in routine maritime operations.

## Installation

### Dependencies

This plugin depends on [GDAL](https://gdal.org/en/stable/index.html) and [tippecanoe](https://github.com/felt/tippecanoe).

```bash
sudo apt-get install dgal-bin gcc g++ make libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe
make
make install
```

#### Docker

As long as you are not running Signal K in docker, you can run gdal and tippecanoe in Docker.

1. Ensure the user running Signal K has access to the Docker socket. This is usually done by adding the user to the `docker` group, but [look here](https://github.com/sindresorhus/guides/blob/main/docker-without-sudo.md) if this is not sufficient on your system.
   ```bash
   sudo usermod -aG docker $USER
   ```

2. Log out and back in to apply the group change.

3. Install the Docker images for gdal and tippecanoe:
   ```sh
   docker pull ghcr.io/bkeepers/tippecanoe:main
   docker pull ghcr.io/osgeo/gdal:alpine-small-latest
   ```

4. Set environment variables to use the docker images. I added these at the top of ~/.signalk/signalk-server
   ```
   #!/bin/sh

   # Configure the path to your Signal K config directory, if not already set
   SIGNALK_NODE_CONFIG_DIR=${SIGNALK_NODE_CONFIG_DIR:="/home/pi/.signalk"}

   # Base docker command to run, making the Signalk K config directory available
   SIGNALK_DOCKER="docker run --rm -v $SIGNALK_NODE_CONFIG_DIR:$SIGNALK_NODE_CONFIG_DIR"

   export TIPPECANOE_PATH="$SIGNALK_DOCKER ghcr.io/bkeepers/tippecanoe:main tippecanoe"
   export GDAL_GRID_PATH="$SIGNALK_DOCKER ghcr.io/osgeo/gdal:alpine-small-latest gdal_grid"
   export GDAL_CONTOUR_PATH="$SIGNALK_DOCKER ghcr.io/osgeo/gdal:alpine-small-latest gdal_contour"

    /usr/lib/node_modules/signalk-server/bin/signalk-server -c $SIGNALK_NODE_CONFIG_DIR $*
   ```

## Resources

- [IHO Guidance to Crowdsourced Bathymetry](https://iho.int/uploads/user/pubs/bathy/B_12_CSB-Guidance_Document-Edition_3.0.0_Final.pdf)
- [Guidance for Submitting Crowdsourced Bathymetry Data](https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/GuidanceforSubmittingCSBDataToTheIHODCDB%20%281%29.pdf)
- [Crowdsourced Bathymetry File Formats for Submission to the IHO Data Center for Digital Bathymetry](https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/SampleCSBFileFormats.pdf)
- [Workshop on Crowdsourced Bathemtry (2024)](https://iho.int/uploads/user/Inter-Regional%20Coordination/CSBWG/CSBWG_IRCC_CSB_Workshop/IRCC_CSB_workshop_April24_Master.pdf)
- [IHO Crowdsourced Bathymetry Trusted Node Agreement](https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/IHOCSBTrustedNodeAgreementFormTemplate.pdf)
- [Data Centre for Digital Bathemtry Viewer](https://www.ncei.noaa.gov/maps/iho_dcdb/)
