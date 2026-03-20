import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import type { User } from '../../types';

interface MentionTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

// Parse @[Name](userId) mentions from text
export function parseMentions(text: string): { userId: string; name: string }[] {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: { userId: string; name: string }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        mentions.push({ name: match[1], userId: match[2] });
    }
    return mentions;
}

// Render text with highlighted mentions
export function renderMentionText(text: string): React.ReactNode[] {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Text before the mention
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        // The mention itself
        parts.push(
            <span key={match.index} className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                @{match[1]}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
    value,
    onChange,
    placeholder,
    className,
    disabled
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const usersLoadedRef = useRef(false);

    // Load users once
    useEffect(() => {
        if (usersLoadedRef.current) return;
        usersLoadedRef.current = true;
        DatabaseService.getAllUsers().then(allUsers => {
            // Only internal users (admin, sales_rep, manager)
            const internal = allUsers.filter(u =>
                u.role === 'admin' || u.role === 'sales_rep' || u.role === 'manager' || u.role === 'owner'
            );
            setUsers(internal);
        }).catch(err => console.error('Failed to load users for mentions:', err));
    }, []);

    // Filter users based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredUsers(users.filter(u => {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                return fullName.includes(q);
            }));
        }
        setSelectedIndex(0);
    }, [searchQuery, users]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        onChange(newValue);
        setCursorPosition(newCursorPos);

        // Check if @ was typed — look backwards from cursor for a trigger
        const textBeforeCursor = newValue.substring(0, newCursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setSearchQuery(atMatch[1]);
            setShowDropdown(true);

            // Position dropdown near cursor
            if (textareaRef.current) {
                const ta = textareaRef.current;
                const rect = ta.getBoundingClientRect();
                // Rough approximation of cursor position
                const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
                const lines = textBeforeCursor.split('\n');
                const currentLine = lines.length;
                setDropdownPosition({
                    top: Math.min(currentLine * lineHeight + 4, ta.clientHeight),
                    left: 8
                });
            }
        } else {
            setShowDropdown(false);
            setSearchQuery('');
        }
    };

    const insertMention = useCallback((user: User) => {
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);

        // Find where the @ trigger starts
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        if (!atMatch) return;

        const atStartIndex = textBeforeCursor.lastIndexOf('@');
        const beforeAt = value.substring(0, atStartIndex);
        const mentionTag = `@[${user.firstName} ${user.lastName}](${user.id}) `;
        const newValue = beforeAt + mentionTag + textAfterCursor;

        onChange(newValue);
        setShowDropdown(false);
        setSearchQuery('');

        // Refocus textarea
        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = (beforeAt + mentionTag).length;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 10);
    }, [value, cursorPosition, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || filteredUsers.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredUsers.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(filteredUsers[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDropdown]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
            />

            {showDropdown && filteredUsers.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 w-64"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erwähne einen Kollegen</span>
                    </div>
                    {filteredUsers.slice(0, 8).map((user, idx) => (
                        <button
                            key={user.id}
                            type="button"
                            onClick={() => insertMention(user)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                idx === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
                                <p className="text-[10px] text-slate-400 capitalize">{user.role === 'sales_rep' ? 'Vertrieb' : user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : user.role}</p>
                            </div>
                        </button>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="px-3 py-3 text-xs text-slate-400 text-center">Kein Benutzer gefunden</div>
                    )}
                </div>
            )}
        </div>
    );
};
