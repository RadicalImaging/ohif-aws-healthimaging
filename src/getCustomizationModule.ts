import HealthLake from './ui-components/HealthLake';
export default function getCustomizationModule() {
  return [
    {
      name: 'healthlake',
      value: {
        id: 'customRoutes',
        routes: [
          {
            path: '/healthlake',
            children: HealthLake,
          },
        ],
      },
    },
  ];
}
