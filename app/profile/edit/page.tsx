import { Suspense } from 'react';
import { ProfileForm } from '@/components/forms/profile-form';
import { PortfolioWidget } from '@/components/profile/portfolio-widget';
import { PortfolioWidgetSkeleton } from '@/components/ui/skeleton-group';
import { getServerSession } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

/** Links already saved on the signed-in user's profile (empty when signed out). */
async function getSavedLinks() {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) return null;
        return await prisma.creatorProfile.findUnique({
            where: { userId: session.user.id },
            select: { githubUrl: true, figmaUrl: true, websiteUrl: true },
        });
    } catch {
        return null;
    }
}

async function LinkedProfiles() {
    const links = await getSavedLinks();
    return (
        <PortfolioWidget
            githubUrl={links?.githubUrl}
            figmaUrl={links?.figmaUrl}
            websiteUrl={links?.websiteUrl}
        />
    );
}

export default function ProfileEditPage() {
    return (
        <div className="container max-w-2xl py-10">
            <div className="space-y-6">
                <div>
                    <h4 className="text-md font-medium">Linked profiles</h4>
                    <p className="text-sm text-muted-foreground">
                        Live data from the accounts you have linked. Edit the links below to verify them.
                    </p>
                    <div className="mt-4">
                        <Suspense fallback={<PortfolioWidgetSkeleton />}>
                            <LinkedProfiles />
                        </Suspense>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium">Profile</h3>
                    <p className="text-sm text-muted-foreground">
                        Update your profile and link your social accounts.
                    </p>
                </div>
                <div className="border-t pt-6">
                    <ProfileForm />
                </div>
            </div>
        </div>
    );
}
