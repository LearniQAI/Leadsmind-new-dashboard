export const imageLoader = ({ src, width, quality }: any) => {
    return `${src}?w=${width || 500}&q=${quality || 75}`;
}