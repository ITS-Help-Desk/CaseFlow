/**
 * Permissions Utility
 * Provides role hierarchy checking and permission validation
 */

// Role hierarchy - matches backend ROLE_HIERARCHY
// Higher number = higher permissions
export const ROLE_HIERARCHY = {
    'Tech': 1,
    'Lead': 2,
    'Phone Analyst': 3,
    'Manager': 4
};

/**
 * Get the highest role level for a user
 * @param {Array} userGroups - Array of group objects with 'name' property
 * @returns {number} - Highest role level
 */
export function getUserHighestRoleLevel(userGroups) {
    if (!userGroups || !Array.isArray(userGroups)) {
        return 0;
    }
    
    let maxLevel = 0;
    for (const group of userGroups) {
        const groupName = typeof group === 'string' ? group : group.name;
        const level = ROLE_HIERARCHY[groupName] || 0;
        if (level > maxLevel) {
            maxLevel = level;
        }
    }
    
    return maxLevel;
}

/**
 * Check if user has at least the specified role level
 * @param {Array} userGroups - Array of group objects or group names
 * @param {string} minimumRole - Minimum required role name
 * @returns {boolean} - True if user has sufficient permissions
 */
export function hasMinimumRole(userGroups, minimumRole) {
    const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;
    const userLevel = getUserHighestRoleLevel(userGroups);
    return userLevel >= minimumLevel;
}

/**
 * Check if user has a specific role (exact match, not hierarchical)
 * @param {Array} userGroups - Array of group objects or group names
 * @param {string} roleName - Role name to check
 * @returns {boolean} - True if user has the exact role
 */
export function hasRole(userGroups, roleName) {
    if (!userGroups || !Array.isArray(userGroups)) {
        return false;
    }
    
    return userGroups.some(group => {
        const groupName = typeof group === 'string' ? group : group.name;
        return groupName === roleName;
    });
}

/**
 * Get all roles that a user has permission to act as (hierarchical)
 * @param {Array} userGroups - Array of group objects or group names
 * @returns {Array} - Array of role names user has permission for
 */
export function getPermittedRoles(userGroups) {
    const userLevel = getUserHighestRoleLevel(userGroups);
    
    return Object.keys(ROLE_HIERARCHY).filter(roleName => {
        return ROLE_HIERARCHY[roleName] <= userLevel;
    });
}

/**
 * Get user's highest role name
 * @param {Array} userGroups - Array of group objects or group names
 * @returns {string} - Name of highest role, or 'No Role'
 */
export function getHighestRoleName(userGroups) {
    if (!userGroups || !Array.isArray(userGroups)) {
        return 'No Role';
    }
    
    let maxLevel = 0;
    let highestRole = 'No Role';
    
    for (const group of userGroups) {
        const groupName = typeof group === 'string' ? group : group.name;
        const level = ROLE_HIERARCHY[groupName] || 0;
        if (level > maxLevel) {
            maxLevel = level;
            highestRole = groupName;
        }
    }
    
    return highestRole;
}

/**
 * Check if userA has higher or equal permissions than userB
 * @param {Array} userAGroups - User A's groups
 * @param {Array} userBGroups - User B's groups
 * @returns {boolean} - True if userA >= userB in hierarchy
 */
export function hasHigherOrEqualRole(userAGroups, userBGroups) {
    const levelA = getUserHighestRoleLevel(userAGroups);
    const levelB = getUserHighestRoleLevel(userBGroups);
    return levelA >= levelB;
}

export default {
    ROLE_HIERARCHY,
    getUserHighestRoleLevel,
    hasMinimumRole,
    hasRole,
    getPermittedRoles,
    getHighestRoleName,
    hasHigherOrEqualRole
};

