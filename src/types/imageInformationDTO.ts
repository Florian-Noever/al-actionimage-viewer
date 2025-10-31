export interface ImageInformationDTO {
    name?: string | null;
    category?: string | null;
    tags: string[];
    imageDataUrl?: string | null;
}

export interface ImageInformation extends ImageInformationDTO { }
