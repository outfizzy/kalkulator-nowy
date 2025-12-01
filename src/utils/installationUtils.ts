import type { Installation } from '../types';

// Utility: Get region from city name
export const getRegion = (city: string): string => {
    const wojewodztwa: Record<string, string[]> = {
        'Mazowieckie': ['warszawa', 'radom', 'płock', 'siedlce', 'ostrołęka', 'ciechanów'],
        'Śląskie': ['katowice', 'sosnowiec', 'gliwice', 'bielsko-biała', 'zabrze', 'bytom', 'ruda śląska', 'tychy'],
        'Wielkopolskie': ['poznań', 'kalisz', 'konin', 'piła', 'leszno', 'gniezno'],
        'Małopolskie': ['kraków', 'tarnów', 'nowy sącz', 'oświęcim'],
        'Dolnośląskie': ['wrocław', 'wałbrzych', 'legnica', 'jelenia góra'],
        'Łódzkie': ['łódź', 'piotrków trybunalski', 'pabianice', 'tomaszów mazowiecki'],
        'Zachodniopomorskie': ['szczecin', 'koszalin', 'stargard', 'świnoujście'],
        'Pomorskie': ['gdańsk', 'gdynia', 'sopot', 'słupsk'],
        'Lubelskie': ['lublin', 'chełm', 'zamość', 'biała podlaska'],
        'Podkarpackie': ['rzeszów', 'przemyśl', 'stalowa wola', 'tarnobrzeg'],
        'Warmińsko-Mazurskie': ['olsztyn', 'elbląg', 'ełk'],
        'Kujawsko-Pomorskie': ['bydgoszcz', 'toruń', 'włocławek'],
        'Świętokrzyskie': ['kielce', 'ostrowiec świętokrzyski', 'radom'],
        'Podlaskie': ['białystok', 'suwałki', 'łomża'],
        'Opolskie': ['opole', 'kędzierzyn-koźle'],
        'Lubuskie': ['gorzów wielkopolski', 'zielona góra'],
    };

    const cityLower = city.toLowerCase().trim();
    for (const [region, cities] of Object.entries(wojewodztwa)) {
        if (cities.some(c => cityLower.includes(c) || c.includes(cityLower))) {
            return region;
        }
    }
    return 'Inne';
};

// Utility: Group installations
export const groupInstallations = (
    installations: Installation[],
    groupBy: 'none' | 'region' | 'status' | 'team',
    teams: Array<{ id: string; name: string }>
): Record<string, Installation[]> => {
    if (groupBy === 'none') {
        return { 'all': installations };
    }

    const groups: Record<string, Installation[]> = {};

    installations.forEach(inst => {
        let key: string;

        switch (groupBy) {
            case 'region':
                key = getRegion(inst.client.city);
                break;
            case 'status':
                key = inst.status;
                break;
            case 'team':
                if (inst.teamId) {
                    const team = teams.find(t => t.id === inst.teamId);
                    key = team ? team.name : 'Nieprzypisane';
                } else {
                    key = 'Nieprzypisane';
                }
                break;
            default:
                key = 'all';
        }

        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(inst);
    });

    return groups;
};

// Utility: Sort installations
export const sortInstallations = (
    installations: Installation[],
    sortBy: 'date' | 'city' | 'status'
): Installation[] => {
    return [...installations].sort((a, b) => {
        switch (sortBy) {
            case 'date': {
                if (!a.scheduledDate && !b.scheduledDate) return 0;
                if (!a.scheduledDate) return 1;
                if (!b.scheduledDate) return -1;
                return a.scheduledDate.localeCompare(b.scheduledDate);
            }

            case 'city':
                return a.client.city.localeCompare(b.client.city);

            case 'status': {
                const statusOrder: Record<string, number> = { 'pending': 0, 'scheduled': 1, 'completed': 2, 'issue': 3 };
                const aOrder = statusOrder[a.status] ?? 0;
                const bOrder = statusOrder[b.status] ?? 0;
                return aOrder - bOrder;
            }

            default:
                return 0;
        }
    });
};

// Utility: Get status label in Polish
export const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        'pending': 'Oczekujące',
        'scheduled': 'Zaplanowane',
        'completed': 'Zakończone',
        'issue': 'Problem'
    };
    return labels[status] || status;
};

// Utility: Get status color
export const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'scheduled': 'bg-blue-100 text-blue-700',
        'completed': 'bg-green-100 text-green-700',
        'issue': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
};

// Utility: Get team availability
export const getTeamAvailability = (
    teamId: string,
    date: string,
    installations: Installation[]
): { status: 'free' | 'busy' | 'partial'; count: number } => {
    const teamInstallations = installations.filter(
        i => i.teamId === teamId && i.scheduledDate === date
    );

    const count = teamInstallations.length;
    if (count === 0) return { status: 'free', count };
    if (count >= 3) return { status: 'busy', count }; // Assuming 3 is max per day
    return { status: 'partial', count };
};
