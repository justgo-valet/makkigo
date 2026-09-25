import { Image } from "../ui/image";

export interface CarProps {
    imgaeSrc: string,
    brandName: string,
    modelName: string,
};

function Car(props : CarProps) {
    return <div>
        <Image src={props.imgaeSrc} alt={`${props.brandName} ${props.modelName}`} />
    </div>
}

export { Car };