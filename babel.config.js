export default function (api) {
    api.cache(true);
    return {
        presets: [
            "babel-preset-expo",
            "nativewind/babel",
        ],
    };
};