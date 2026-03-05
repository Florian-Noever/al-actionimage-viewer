export interface ImageInformationDTO {
    name?: string | null;
    category?: string | null;
    tags: string[];
    imageDataUrl?: string | null;
}

export type ImageInformation = ImageInformationDTO;
